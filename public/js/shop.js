
const emojis = {
  chocolate: '🎂',
  cheese: '🍰',
  cupcake: '🧁',
  cookies: '🍪',
  strawberry: '🍓',
  macaron: '🍬',
  brownie: '🍫',
  croissant: '🥐',
  tiramisu: '🍮',
  truffles: '🍫',
  lemon: '🍋',
  cinnamon: '🥮',
  birthdaybox: '🎁',
  chocolatebox: '🎁',
  couplebox: '🎁',
  giftbox: '🎁',
  minibox: '🎁'
};

const productImages = {
  chocolate: 'images/chocolate.jpg',
  cheese: 'images/cheese.jpg',
  cupcake: 'images/cupcake.jpg',
  cookies: 'images/cookies.jpg',
  strawberry: 'images/strawberry.jpg',
  macaron: 'images/macaron.jpg',
  brownie: 'images/brownie.jpg',
  croissant: 'images/croissant.jpg',
  tiramisu: 'images/tiramisu.jpg',
  truffles: 'images/truffles.jpg',
  lemon: 'images/lemon.jpg',
  cinnamon: 'images/cinnamon.jpg'
};

let currentProducts = [];

// =====================================
// התאמת שמות הקטגוריות
// =====================================

function normalizeCategory(value) {
  const category = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const aliases = {
    'עוגות': 'cakes',
    'עוגה': 'cakes',
    'cake': 'cakes',
    'cakes': 'cakes',

    'קאפקייקס': 'cupcakes',
    'קאפקייק': 'cupcakes',
    'cupcake': 'cupcakes',
    'cupcakes': 'cupcakes',

    'עוגיות': 'cookies',
    'עוגייה': 'cookies',
    'cookie': 'cookies',
    'cookies': 'cookies',

    'מאפים': 'pastries',
    'מאפה': 'pastries',
    'pastry': 'pastries',
    'pastries': 'pastries',

    'קינוחי כוסות': 'cup-desserts',
    'קינוחי כוס': 'cup-desserts',
    'cup desserts': 'cup-desserts',
    'cup-desserts': 'cup-desserts',

    'שוקולדים': 'chocolates',
    'שוקולד': 'chocolates',
    'chocolate': 'chocolates',
    'chocolates': 'chocolates',

    'מארזים': 'boxes',
    'מארז': 'boxes',
    'box': 'boxes',
    'boxes': 'boxes',
    'giftboxes': 'boxes'
  };

  return aliases[category] || category;
}

// =====================================
// תגית מלאי
// =====================================

function getStockBadge(stock) {
  if (stock === 0) {
    return `
      <span class="stock-badge sold-out">
        ❌ אזל מהמלאי
      </span>
    `;
  }

  if (stock <= 5) {
    return `
      <span class="stock-badge low-stock">
        🔥 נותרו רק ${stock} יחידות!
      </span>
    `;
  }

  return `
    <span class="stock-badge in-stock">
      ✓ זמין להזמנה
    </span>
  `;
}

// =====================================
// הצגת מוצרים
// =====================================

function renderProducts(products) {
  const container = $('#product-list');

  if (!container) return;

  container.innerHTML = products.length
    ? products.map(p => {
        const image = productImages[p.image];
        const emoji = emojis[p.image] || '🎁';
        const stock = Math.max(0, Number(p.inStock) || 0);

        return `
          <article class="product">

            <div class="dessert">
              ${
                image
                  ? `
                    <img
                      src="${image}"
                      alt="${escapeHtml(p.name)}"
                      loading="lazy"
                      onerror="this.hidden=true;this.nextElementSibling.hidden=false"
                    >
                    <span class="dessert-fallback" hidden>
                      ${emoji}
                    </span>
                  `
                  : `<span>${emoji}</span>`
              }
            </div>

            <div class="product-badge-area">
              ${getStockBadge(stock)}
            </div>

            <h3>${escapeHtml(p.name)}</h3>

            <p>${escapeHtml(p.description || '')}</p>

            <div class="price">
              ${money(p.price)}
            </div>

            <p class="${stock > 0 ? 'stock-available' : 'stock-empty'}">
              ${
                stock > 0
                  ? `במלאי: ${stock} יחידות`
                  : 'אזל מהמלאי כרגע'
              }
            </p>

            ${
              stock > 0
                ? `
                  <button
                    class="btn"
                    data-add="${escapeHtml(p._id)}"
                  >
                    הוסף לסל 🛒
                  </button>
                `
                : `
                  <button class="btn" disabled>
                    אזל מהמלאי כרגע
                  </button>
                `
            }

          </article>
        `;
      }).join('')
    : 'לא נמצאו מוצרים בקטגוריה זו';

  // הוספה לסל תוך בדיקת מלאי
  document.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = async () => {
      button.disabled = true;

      try {
        const latest = await api('/api/products');

        const product = latest.find(
          p => p._id === button.dataset.add
        );

        if (!product) {
          notify('המוצר לא נמצא');
          return;
        }

        const cart = getCart();

        const existing = cart.find(
          x => x.productId === product._id
        );

        const quantity = existing
          ? Number(existing.quantity) || 0
          : 0;

        const available = Math.max(
          0,
          Number(product.inStock) || 0
        );

        if (quantity >= available) {
          notify('אין מספיק מלאי מהמוצר הזה');
          return;
        }

        addCart(product._id);

      } catch (error) {
        notify(error.message);
      } finally {
        button.disabled = false;
      }
    };
  });
}

// =====================================
// סינון ומיון מוצרים
// =====================================

function filterAndSortProducts() {
  const categorySelect = $('#category');
  const sortSelect = $('#sort');

  const selectedCategory = categorySelect
    ? normalizeCategory(categorySelect.value)
    : 'all';

  const selectedSort = sortSelect
    ? sortSelect.value
    : 'name';

  let products = [...currentProducts];

  // סינון לפי קטגוריה
  if (selectedCategory !== 'all' && selectedCategory !== '') {
    products = products.filter(p =>
      normalizeCategory(p.category) === selectedCategory
    );
  }

  // מיון לפי מחיר או שם
  if (selectedSort === 'priceAsc') {
    products.sort(
      (a, b) => Number(a.price) - Number(b.price)
    );
  } else if (selectedSort === 'priceDesc') {
    products.sort(
      (a, b) => Number(b.price) - Number(a.price)
    );
  } else {
    products.sort((a, b) =>
      String(a.name || '').localeCompare(
        String(b.name || ''),
        'he'
      )
    );
  }

  renderProducts(products);
}

// =====================================
// טעינת כל המוצרים מהשרת
// =====================================

async function loadProducts() {
  try {
    const data = await api('/api/products');

    if (!Array.isArray(data)) {
      throw new Error('התקבלה תשובה לא תקינה מהשרת');
    }

    currentProducts = data;
    filterAndSortProducts();

  } catch (error) {
    console.error('Products loading error:', error);
    notify(error.message);
  }
}

// =====================================
// קטגוריה שמגיעה מקישור בדף הבית
// =====================================

const params = new URLSearchParams(window.location.search);
const selectedCategory = params.get('category');

const categorySelect = $('#category');

if (selectedCategory && categorySelect) {
  const matchingOption = [...categorySelect.options].find(
    option =>
      normalizeCategory(option.value) ===
      normalizeCategory(selectedCategory)
  );

  if (matchingOption) {
    categorySelect.value = matchingOption.value;
  }
}

// =====================================
// שינוי מיון
// =====================================

const sortSelect = $('#sort');

if (sortSelect) {
  sortSelect.onchange = filterAndSortProducts;
}

// =====================================
// שינוי קטגוריה
// =====================================

if (categorySelect) {
  categorySelect.onchange = () => {
    const category = categorySelect.value;
    const url = new URL(window.location.href);

    if (normalizeCategory(category) === 'all') {
      url.searchParams.delete('category');
    } else {
      url.searchParams.set('category', category);
    }

    window.history.replaceState({}, '', url);

    filterAndSortProducts();
  };
}

// טעינה ראשונית
loadProducts();

// רענון מוצרים ומלאי כשחוזרים לעמוד
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadProducts();
  }
});

// =====================================
// API מזג אוויר
// =====================================

api('/api/weather')
  .then(data => {
    const weather = $('#weather');

    if (weather) {
      weather.textContent =
        `🌤 מזג האוויר ב${data.city}: ${data.temperature}°C`;
    }
  })
  .catch(() => {
    const weather = $('#weather');

    if (weather) {
      weather.textContent =
        '🌤 מזג האוויר אינו זמין כרגע';
    }
  });

// =====================================
// API המרת מטבעות
// =====================================

api('/api/currency')
  .then(data => {
    const currency = $('#currency');

    if (currency) {
      currency.textContent =
        `💱 דולר אחד = ₪${Number(data.ilsPerUsd).toFixed(2)} (עדכון ${data.date})`;
    }
  })
  .catch(() => {
    const currency = $('#currency');

    if (currency) {
      currency.textContent =
        '💱 שער המטבע אינו זמין כרגע';
    }
  });
