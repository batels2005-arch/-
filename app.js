

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.use(session({
  name: 'sweet.sid',
  secret: process.env.SESSION_SECRET || 'local-dev-only-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400000
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const auth = (req, res, next) =>
  req.session.uid
    ? next()
    : res.status(401).json({ error: 'יש להתחבר' });

const admin = (req, res, next) =>
  req.session.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'גישה למנהל בלבד' });

const cleanUser = user => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role
});

// ==============================
// בדיקת שרת
// ==============================

app.get('/api/test', (req, res) => {
  res.json({ message: 'Sweet Shop server is working!' });
});

// ==============================
// הרשמה
// ==============================

app.post('/api/register', wrap(async (req, res) => {
  let { name, email, password } = req.body;

  name = String(name || '').trim();
  email = String(email || '').trim().toLowerCase();

  if (
    name.length < 2 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    return res.status(400).json({
      error: 'יש להזין שם, אימייל וסיסמה של 6 תווים לפחות'
    });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({
      error: 'כתובת האימייל כבר קיימת'
    });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10)
  });

  req.session.uid = String(user._id);
  req.session.role = user.role;

  res.status(201).json({ user: cleanUser(user) });
}));

// ==============================
// התחברות
// ==============================

app.post('/api/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();

  const user = await User.findOne({ email });

  if (
    !user ||
    !await bcrypt.compare(
      String(req.body.password || ''),
      user.passwordHash
    )
  ) {
    return res.status(401).json({
      error: 'פרטי התחברות שגויים'
    });
  }

  req.session.regenerate(error => {
    if (error) {
      return res.status(500).json({
        error: 'שגיאת התחברות'
      });
    }

    req.session.uid = String(user._id);
    req.session.role = user.role;

    res.json({ user: cleanUser(user) });
  });
}));

// ==============================
// התנתקות
// ==============================

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sweet.sid');
    res.json({ ok: true });
  });
});

// ==============================
// המשתמש המחובר
// ==============================

app.get('/api/me', wrap(async (req, res) => {
  if (!req.session.uid) {
    return res.json({ user: null });
  }

  const user = await User.findById(req.session.uid);

  res.json({
    user: user ? cleanUser(user) : null
  });
}));

// ==============================
// הצגת מוצרים
// ==============================

app.get('/api/products', wrap(async (req, res) => {
  const sort =
    req.query.sort === 'priceAsc'
      ? { price: 1 }
      : req.query.sort === 'priceDesc'
        ? { price: -1 }
        : { name: 1 };

  const filter = {};

  if (req.query.category && req.query.category !== 'all') {
    filter.category = req.query.category;
  }

  const products = await Product.find(filter).sort(sort).lean();

  res.json(products);
}));

// ==============================
// הוספת מוצר - מנהל
// ==============================

app.post('/api/products', auth, admin, wrap(async (req, res) => {
  const {
    name,
    price,
    category,
    description,
    image,
    inStock
  } = req.body;

  if (
    !String(name || '').trim() ||
    !String(category || '').trim() ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0 ||
    !Number.isInteger(Number(inStock)) ||
    Number(inStock) < 0
  ) {
    return res.status(400).json({
      error: 'נתוני מוצר לא תקינים'
    });
  }

  const product = await Product.create({
    name: String(name).trim(),
    price: Number(price),
    category: String(category).trim(),
    description: String(description || ''),
    image: String(image || ''),
    inStock: Number(inStock)
  });

  res.status(201).json(product);
}));

// ==============================
// עריכת מוצר - מנהל
// ==============================

app.put('/api/products/:id', auth, admin, wrap(async (req, res) => {
  const {
    name,
    price,
    category,
    description,
    image,
    inStock
  } = req.body;

  if (
    !String(name || '').trim() ||
    !String(category || '').trim() ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0 ||
    !Number.isInteger(Number(inStock)) ||
    Number(inStock) < 0
  ) {
    return res.status(400).json({
      error: 'נתוני מוצר לא תקינים'
    });
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: String(name).trim(),
      price: Number(price),
      category: String(category).trim(),
      description: String(description || ''),
      image: String(image || ''),
      inStock: Number(inStock)
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!product) {
    return res.status(404).json({
      error: 'מוצר לא נמצא'
    });
  }

  res.json(product);
}));

// ==============================
// מחיקת מוצר - מנהל
// ==============================

app.delete('/api/products/:id', auth, admin, wrap(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({
      error: 'מוצר לא נמצא'
    });
  }

  res.json({ ok: true });
}));

// ==============================
// ביצוע הזמנה ותשלום מדומה
// ==============================

app.post('/api/orders', auth, wrap(async (req, res) => {
  const incoming = req.body.items;

  if (
    !Array.isArray(incoming) ||
    incoming.length === 0 ||
    incoming.length > 30
  ) {
    return res.status(400).json({
      error: 'סל ריק או לא תקין'
    });
  }

  // פרטי משלוח
  const shipping = req.body.shipping || {};

  const fullName = String(shipping.fullName || '').trim();
  const phone = String(shipping.phone || '').trim();
  const city = String(shipping.city || '').trim();
  const street = String(shipping.street || '').trim();
  const houseNumber = String(shipping.houseNumber || '').trim();
  const apartment = String(shipping.apartment || '').trim();
  const notes = String(shipping.notes || '').trim();

  if (
    fullName.length < 2 ||
    fullName.length > 100 ||
    !/^0\d{8,9}$/.test(phone) ||
    !city ||
    city.length > 100 ||
    !street ||
    street.length > 100 ||
    !houseNumber ||
    houseNumber.length > 20 ||
    apartment.length > 30 ||
    notes.length > 500
  ) {
    return res.status(400).json({
      error: 'יש למלא פרטי משלוח תקינים'
    });
  }

  const address = [
    city,
    street,
    `מספר ${houseNumber}`,
    apartment ? `דירה ${apartment}` : ''
  ].filter(Boolean).join(', ');

  // אמצעי תשלום
  const paymentMethod = req.body.paymentMethod;

  if (!['cash', 'card_demo'].includes(paymentMethod)) {
    return res.status(400).json({
      error: 'יש לבחור אמצעי תשלום תקין'
    });
  }

  // בדיקת הכמויות
  const quantities = new Map();

  for (const item of incoming) {
    if (
      !item ||
      !mongoose.isValidObjectId(item.productId) ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 50
    ) {
      return res.status(400).json({
        error: 'כמות או מוצר לא תקינים'
      });
    }

    const id = String(item.productId);

    quantities.set(
      id,
      (quantities.get(id) || 0) + item.quantity
    );

    if (quantities.get(id) > 50) {
      return res.status(400).json({
        error: 'ניתן להזמין עד 50 יחידות מכל מוצר'
      });
    }
  }

  // שמירת ההזמנה והפחתת המלאי באותה פעולה
  const dbSession = await mongoose.startSession();

  let createdOrder;

  try {
    await dbSession.withTransaction(async () => {
      const products = await Product.find({
        _id: { $in: [...quantities.keys()] }
      }).session(dbSession);

      if (products.length !== quantities.size) {
        const error = new Error('מוצר חסר');
        error.status = 400;
        throw error;
      }

      const items = products.map(product => ({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: quantities.get(String(product._id))
      }));

      // חישוב הסכום לפי מחירי המוצרים בשרת
      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // משלוח 30 ש"ח, חינם מ-300 ש"ח
      const shippingFee = subtotal >= 300 ? 0 : 30;
      const total = subtotal + shippingFee;

      // הפחתת מלאי
      for (const product of products) {
        const quantity = quantities.get(String(product._id));

        const result = await Product.updateOne(
          {
            _id: product._id,
            inStock: { $gte: quantity }
          },
          {
            $inc: { inStock: -quantity }
          },
          { session: dbSession }
        );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            `אין מספיק מלאי: ${product.name}`
          );

          error.status = 400;
          throw error;
        }
      }

      // יצירת הזמנה
      const orders = await Order.create([{
        user: req.session.uid,
        items,
        subtotal,
        shippingFee,
        total,

        customer: {
          fullName,
          phone,
          address,
          city,
          street,
          houseNumber,
          apartment,
          notes
        },

        paymentMethod,

        paymentStatus:
          paymentMethod === 'card_demo' ? 'demo' : 'unpaid',

        status: 'pending'
      }], { session: dbSession });

      createdOrder = orders[0];
    });

    res.status(201).json(createdOrder);

  } finally {
    await dbSession.endSession();
  }
}));

// ==============================
// ההזמנות שלי
// ==============================

app.get('/api/orders/my', auth, wrap(async (req, res) => {
  const orders = await Order.find({
    user: req.session.uid
  }).sort({ createdAt: -1 }).lean();

  res.json(orders);
}));

// ==============================
// כל ההזמנות - מנהל
// ==============================

app.get('/api/admin/orders', auth, admin, wrap(async (req, res) => {
  const orders = await Order.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  res.json(orders);
}));

// ==============================
// שינוי סטטוס הזמנה - מנהל
// ==============================

app.patch('/api/admin/orders/:id', auth, admin, wrap(async (req, res) => {
  if (!['pending', 'completed', 'cancelled'].includes(req.body.status)) {
    return res.status(400).json({
      error: 'סטטוס לא תקין'
    });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({
      error: 'הזמנה לא נמצאה'
    });
  }

  res.json(order);
}));

// ==============================
// סטטיסטיקות - מנהל
// ==============================

app.get('/api/admin/stats', auth, admin, wrap(async (req, res) => {
  const byStatus = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const byCategory = await Order.aggregate([
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: {
          $ifNull: ['$product.category', 'אחר']
        },
        revenue: {
          $sum: {
            $multiply: [
              '$items.price',
              '$items.quantity'
            ]
          }
        }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  const revenueResult = await Order.aggregate([
    {
      $match: {
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' }
      }
    }
  ]);

  res.json({
    byStatus,
    byCategory,
    totalOrders: await Order.countDocuments(),
    totalProducts: await Product.countDocuments(),
    totalUsers: await User.countDocuments(),
    revenue: revenueResult[0]?.total || 0
  });
}));

// ==============================
// מזג אוויר
// ==============================

app.get('/api/weather', wrap(async (req, res) => {
  const response = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=32.08&longitude=34.78&current=temperature_2m&timezone=Asia%2FJerusalem'
  );

  if (!response.ok) {
    throw new Error('weather');
  }

  const data = await response.json();

  res.json({
    city: 'תל אביב',
    temperature: data.current.temperature_2m
  });
}));

// ==============================
// המרת מטבעות
// ==============================

app.get('/api/currency', wrap(async (req, res) => {
  const response = await fetch(
    'https://api.frankfurter.dev/v1/latest?base=USD&symbols=ILS'
  );

  if (!response.ok) {
    throw new Error('currency');
  }

  const data = await response.json();

  res.json({
    ilsPerUsd: data.rates.ILS,
    date: data.date
  });
}));

// ==============================
// טיפול בשגיאות
// ==============================

app.use((err, req, res, next) => {
  console.error(err);

  const status =
    err.status === 400
      ? 400
      : err.name === 'CastError'
        ? 400
        : 500;

  res.status(status).json({
    error: status === 400
      ? err.message
      : 'שגיאת שרת. בדקי את הטרמינל'
  });
});

// ==============================
// הפעלת השרת
// ==============================

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI || '')
  .then(() => {
    console.log('Connected to MongoDB Atlas!');

    app.listen(PORT, () => {
      console.log(
        `Server is running on http://localhost:${PORT}`
      );
    });
  })
  .catch(error => {
    console.error(
      'MongoDB connection error:',
      error.message
    );

    process.exit(1);
  });
