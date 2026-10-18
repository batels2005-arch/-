
require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const Order = require('./models/Order');
const Product = require('./models/Product');

async function main() {
  const email = process.env.RESET_USER_EMAIL?.trim().toLowerCase();

  if (!process.env.MONGO_URI || !email) {
    throw new Error(
      'יש להגדיר MONGO_URI ו-RESET_USER_EMAIL בקובץ .env'
    );
  }

  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('לא נמצא משתמש עם כתובת האימייל הזאת');
  }

  const orders = await Order.find({ user: user._id }).lean();

  console.log(`נמצאו ${orders.length} הזמנות למשתמש ${email}`);

  if (!orders.length) return;

  // שמירת גיבוי לפני ביצוע שינויים
  const backupPath = path.join(
    __dirname,
    `orders-backup-${Date.now()}.json`
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(orders, null, 2),
    'utf8'
  );

  console.log(`הגיבוי נשמר: ${backupPath}`);

  // סיכום הכמויות שיש להחזיר למלאי
  const restore = new Map();

  for (const order of orders) {
    // הזמנות שבוטלו אינן מוחזרות אוטומטית למלאי
    for (const item of order.items) {
      if (!item.product) continue;

      const id = String(item.product);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('נמצאה כמות לא תקינה בהזמנה');
      }

      restore.set(id, (restore.get(id) || 0) + quantity);
    }
  }

  // מוודאים שכל המוצרים עדיין קיימים
  for (const [id, quantity] of restore) {
    const product = await Product.findById(id);

    if (!product) {
      throw new Error(
        `המוצר ${id} אינו קיים. לא בוצעה מחיקה.`
      );
    }

    console.log(
      `${product.name}: החזרת ${quantity} יחידות`
    );
  }

  // איפוס אטומי באמצעות טרנזקציה
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const [id, quantity] of restore) {
        await Product.updateOne(
          { _id: id },
          { $inc: { inStock: quantity } },
          { session }
        );
      }

      await Order.deleteMany(
        { user: user._id },
        { session }
      );
    });

    console.log('האיפוס הושלם בהצלחה!');
    console.log('רק ההזמנות של המשתמש שנבחר נמחקו.');

  } finally {
    await session.endSession();
  }
}

main()
  .catch(error => {
    console.error('שגיאה:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
