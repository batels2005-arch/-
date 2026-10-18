# Sweet Shop — פרויקט גמר Full Stack

## הפעלה ב־VS Code (Windows)
1. התקיני Node.js גרסה 20.19 ומעלה (מומלץ 22).
2. פתחי את תיקיית `sweet-shop-ready` ב־VS Code.
3. בטרמינל: `npm install`
4. העתיקי את `.env.example` לקובץ חדש בשם `.env` ומלאי את `MONGO_URI`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
5. ב־MongoDB Atlas: ודאי שקיים Database User ושכתובת ה־IP שלך מאושרת ב־Network Access. התחברי גם ב־Compass בעזרת כתובת החיבור.
6. בטרמינל: `npm run seed` (יוצר 6 מוצרים וחשבון מנהל, ללא כפילות מוצרים).
7. בטרמינל: `npm start`
8. פתחי בדפדפן `http://localhost:3000` — **לא** לפתוח את קובצי HTML ישירות.
9. בדיקת שרת: `http://localhost:3000/api/test`.

## כניסת מנהל
התחברי בעמוד `login.html` עם ADMIN_EMAIL ו־ADMIN_PASSWORD שהגדרת ב־`.env`. אין סיסמת מנהל מובנית. אל תעלי את `.env` ל־GitHub.

## מיפוי דרישות המטלה
- Express: `app.js` מגיש את האתר ואת נתיבי API.
- MongoDB Atlas: Collections של `users`, `products`, `orders` באמצעות Mongoose.
- HTML: `index`, `login`, `register`, `cart`, `orders`, `admin` — קבצי CSS/JS נפרדים.
- סוגי משתמשים: אורח, לקוח רשום, מנהל.
- הרשמה והתחברות: `/api/register`, `/api/login`, `/api/me`, `/api/logout`.
- CRUD: GET/POST/PUT/DELETE על מוצרים, מוגבל למנהל (מלבד GET).
- מיון: `/api/products?sort=priceAsc` או `priceDesc`.
- הזמנות: POST `/api/orders`, GET `/api/orders/my`.
- שתי Aggregates: `byStatus` ו־`byCategory` בתוך `/api/admin/stats`.
- שני גרפים: Chart.js בדף המנהל.
- שני APIs חיצוניים: Open-Meteo (מזג אוויר בתל אביב), Frankfurter (שער USD/ILS). נדרש אינטרנט.
- Git: יש לבצע לפחות 3 commits **במועדים שונים במהלך העבודה**; אין דרך ליצור בדיעבד היסטוריית עבודה אמיתית.

## הדגמה להגנה
הציגי: הרשמה → התחברות → הוספת מוצר לסל → הזמנה → Compass (רשומת order) → כניסת מנהל → עריכת מוצר → שני גרפים. ב־DevTools > Network אפשר לראות פניות לשרת.

## הערות
- הפרויקט הוא דמו לימודי ולא חנות מסחר לייצור. Session נשמר בזיכרון השרת, סל הקניות ב־localStorage, ואין תשלום אמיתי.
- בדוגמה זו יצירת הזמנה ועדכון מלאי אינם טרנזקציה אטומית. בהדגמה מקומית זה מספיק, אך לא מתאים לעומס הזמנות אמיתי.
- הגרפים נטענים דרך CDN ולכן נדרש חיבור אינטרנט.
- יש להריץ ולבדוק במחשב שלך מול Atlas לפני ההגשה.
