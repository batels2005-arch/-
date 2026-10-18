
const form = document.querySelector('#form');

form.onsubmit = async event => {
  event.preventDefault();

  const button = form.querySelector('button[type="submit"], button');
  const isRegister = window.location.pathname.endsWith('register.html');

  const userData = Object.fromEntries(
    new FormData(form)
  );

  button.disabled = true;
  button.textContent = isRegister ? 'נרשמים...' : 'מתחברים...';

  try {
    const result = await api(
      isRegister ? '/api/register' : '/api/login',
      {
        method: 'POST',
        body: JSON.stringify(userData)
      }
    );

    // מנהל מועבר ישירות לדשבורד
    if (result.user.role === 'admin') {
      window.location.replace('admin.html');
    } else {
      // לקוח רגיל מועבר לחנות
      window.location.replace('index.html');
    }

  } catch (error) {
    notify(error.message);

    button.disabled = false;
    button.textContent = isRegister ? 'הרשמה' : 'התחברות';
  }
};
