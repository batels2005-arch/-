
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('./models/Product');
const User = require('./models/User');

const data = [
  // עוגות
  ['עוגת שוקולד',120,'עוגות','עוגת שוקולד עשירה עם תותים',12,'chocolate'],
  ['עוגת גבינה',110,'עוגות','עוגת גבינה קרמית',10,'cheese'],
  ['עוגת תותים',130,'עוגות','עוגת וניל ותותים',8,'strawberry'],
  ['מיני עוגת גבינה',42,'עוגות','עוגת גבינה אישית עם תותים',15,'cheese'],

  // קאפקייקס
  ['מארז קאפקייקס',70,'קאפקייקס','שישה קאפקייקס חגיגיים',15,'cupcake'],

  // עוגיות
  ['מארז עוגיות',65,'עוגיות','עוגיות שוקולד צ׳יפס',20,'cookies'],
  ['מקרונים',85,'עוגיות','מארז מקרונים צבעוני',14,'macaron'],
  ['בראוניז שוקולד עשיר',45,'עוגיות','מארז בראוניז שוקולד עשירים ונימוחים',18,'brownie'],
  ['מארז מקרונים צרפתיים',95,'עוגיות','מארז מקרונים בטעמים מיוחדים',12,'macaron'],

  // מאפים
  ['קרואסון פיסטוק',32,'מאפים','קרואסון חמאה במילוי קרם פיסטוק',20,'croissant'],
  ['טארט לימון ומרנג',36,'מאפים','טארט לימון עם מרנג עדין',18,'lemon'],
  ['מארז רול קינמון',58,'מאפים','מאפי קינמון רכים עם ציפוי מתוק',20,'cinnamon'],

  // קינוחים אישיים
  ['טירמיסו אישי',38,'קינוחי כוסות','קינוח טירמיסו עם קרם מסקרפונה וקפה',16,'tiramisu'],

  // שוקולדים
  ['מארז טראפלס שוקולד',79,'שוקולדים','מארז טראפלס שוקולד בלגי',14,'truffles'],

  // מארזי מתנה חדשים
  ['מארז יום הולדת מתוק',159,'מארזים','מארז חגיגי עם עוגיות, קאפקייקס וקינוחים ליום הולדת',10,'birthdaybox'],
  ['מארז שוקולד מפנק',129,'מארזים','מבחר בראוניז וטראפלס שוקולד במארז מתנה',12,'chocolatebox'],
  ['מארז קינוחים זוגי',99,'מארזים','שני קינוחים אישיים ומבחר מתוקים לזוג',15,'couplebox'],
  ['מארז מתנה חגיגי',189,'מארזים','מארז גדול עם מגוון קינוחים מיוחדים לאירועים',8,'giftbox'],
  ['מארז מיני קינוחים',119,'מארזים','מבחר קינוחים קטנים ומפנקים במארז מעוצב',14,'minibox']
];

(async () => {
  if (
    !process.env.MONGO_URI ||
    !process.env.ADMIN_EMAIL ||
    !process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD.length < 8
  ) {
    throw Error('Check MongoDB and admin settings in .env');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('Connected to MongoDB Atlas!');

    let added = 0;
    let existing = 0;

    for (const [
      name,
      price,
      category,
      description,
      inStock,
      image
    ] of data) {

      const result = await Product.updateOne(
        { name },
        {
          $setOnInsert: {
            name,
            price,
            category,
            description,
            inStock,
            image
          }
        },
        { upsert: true }
      );

      if (result.upsertedCount) {
        added++;
      } else {
        existing++;
      }
    }

    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

    const existingAdmin = await User.findOne({ email });

    if (!existingAdmin) {
      await User.create({
        name: 'מנהלת החנות',
        email,
        role: 'admin',
        passwordHash: await bcrypt.hash(
          process.env.ADMIN_PASSWORD,
          10
        )
      });

      console.log('Admin account created.');
    } else {
      console.log('Admin account already exists.');
    }

    console.log('-----------------------------');
    console.log(`New products added: ${added}`);
    console.log(`Existing products preserved: ${existing}`);
    console.log(`Products in seed list: ${data.length}`);
    console.log('Seed completed successfully!');

  } finally {
    await mongoose.disconnect();
  }

})().catch(e => {
  console.error('Seed error:', e.message);
  process.exit(1);
});
