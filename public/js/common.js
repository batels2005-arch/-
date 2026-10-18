
const $ = s => document.querySelector(s);

const money = n => '₪' + Number(n).toFixed(0);

const escapeHtml = s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Error(data.error || 'אירעה שגיאה');
  }

  return data;
}

function notify(message) {
  const notice = $('#notice');

  if (notice) {
    notice.textContent = message;
    notice.classList.add('show');
  } else {
    alert(message);
  }
}

// ===============================
// סרגל ניווט לפי סוג המשתמש
// ===============================

async function initNav() {
  const nav = document.querySelector('.top .nav');

  if (!nav) return;

  try {
    const { user } = await api('/api/me');

    const isAdminPage =
      window.location.pathname.endsWith('admin.html');

    // ===============================
    // סרגל מיוחד לדשבורד המנהל
    // ===============================

    if (isAdminPage && user?.role === 'admin') {
      nav.innerHTML = `
        <div class="nav-top-row">
          <div class="nav-user-name">
            🛡️ שלום ${escapeHtml(user.name)} — מנהלת האתר
          </div>

          <a class="logo" href="admin.html">
            <span>🧁</span> Sweet Shop
          </a>
        </div>

        <div class="nav-bottom-row">
          <div class="nav-main-links">
            <a href="admin.html">📊 דשבורד ניהול</a>
            <a href="index.html">🏠 צפייה בחנות</a>

            <button class="btn small alt" id="logout">
              התנתקות
            </button>
          </div>
        </div>
      `;

      const logoutButton = $('#logout');

      if (logoutButton) {
        logoutButton.onclick = async () => {
          try {
            await api('/api/logout', {
              method: 'POST'
            });

            window.location.href = 'login.html';

          } catch (error) {
            notify(error.message);
          }
        };
      }

      return;
    }

    // ===============================
    // סרגל רגיל ללקוחות ולאורחים
    // ===============================

    const userName = user
      ? `👤 שלום ${escapeHtml(user.name)}`
      : 'ברוכים הבאים ל-Sweet Shop 💗';

    const accountLinks = user
      ? `
          <a href="orders.html">ההזמנות שלי</a>

          ${
            user.role === 'admin'
              ? '<a href="admin.html">ניהול</a>'
              : ''
          }

          <button class="btn small alt" id="logout">
            התנתקות
          </button>
        `
      : `
          <a href="login.html">התחברות</a>
          <a href="register.html">הרשמה</a>
        `;

    nav.innerHTML = `
      <div class="nav-top-row">
        <div class="nav-user-name">
          ${userName}
        </div>

        <a class="logo" href="index.html">
          <span>🧁</span> Sweet Shop
        </a>
      </div>

      <div class="nav-bottom-row">
        <div class="nav-main-links">
          <a href="index.html">בית</a>
          <a href="products.html">מוצרים</a>

          <a href="cart.html">
            🛒 סל (<span id="cart-count">0</span>)
          </a>

          ${accountLinks}
        </div>
      </div>
    `;

    updateCartCount();

    // התנתקות מהאתר
    const logoutButton = $('#logout');

    if (logoutButton) {
      logoutButton.onclick = async () => {
        try {
          await api('/api/logout', {
            method: 'POST'
          });

          window.location.href = 'index.html';

        } catch (error) {
          notify(error.message);
        }
      };
    }

  } catch (error) {
    console.warn('Navigation error:', error.message);
  }
}

// ===============================
// סל הקניות
// ===============================

function getCart() {
  try {
    return JSON.parse(
      localStorage.getItem('sweet-cart') || '[]'
    );
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(
    'sweet-cart',
    JSON.stringify(cart)
  );

  updateCartCount();
}

function updateCartCount() {
  const element = $('#cart-count');

  if (element) {
    element.textContent = getCart().reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );
  }
}

function addCart(id) {
  const cart = getCart();
  const item = cart.find(x => x.productId === id);

  if (item) {
    item.quantity++;
  } else {
    cart.push({
      productId: id,
      quantity: 1
    });
  }

  setCart(cart);
  notify('המוצר נוסף לסל 🛒');
}

// ===============================
// טעינה ראשונית
// ===============================

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  updateCartCount();
});
