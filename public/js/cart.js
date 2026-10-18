
let products = [];
let submitting = false;

const SHIPPING_FEE = 30;
const FREE_SHIPPING_MIN = 300;

// ==========================
// חלונית פופ-אפ
// ==========================

function showCartPopup({ icon, title, message, actions }) {
  const popup = $('#cart-popup');
  const actionsContainer = $('#cart-popup-actions');

  // גיבוי למקרה שה-HTML של החלונית לא נוסף
  if (!popup || !actionsContainer) {
    alert(`${title}\n\n${message}`);
    return;
  }

  $('#cart-popup-icon').textContent = icon;
  $('#cart-popup-title').textContent = title;
  $('#cart-popup-message').textContent = message;

  actionsContainer.innerHTML = '';

  actions.forEach(action => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = action.secondary ? 'btn alt' : 'btn';
    button.textContent = action.label;

    button.onclick = () => {
      popup.hidden = true;
      action.onClick?.();
    };

    actionsContainer.appendChild(button);
  });

  popup.hidden = false;
  actionsContainer.querySelector('button')?.focus();
}

// ==========================
// חישוב סכומים ומשלוח
// ==========================

function calculateTotals(subtotal) {
  const shipping =
    subtotal === 0 || subtotal >= FREE_SHIPPING_MIN
      ? 0
      : SHIPPING_FEE;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function updateSummary(subtotal) {
  const totals = calculateTotals(subtotal);

  $('#products-total').textContent = money(totals.subtotal);

  $('#shipping-cost').textContent =
    subtotal === 0
      ? money(0)
      : totals.shipping === 0
        ? 'חינם 🎁'
        : money(totals.shipping);

  $('#total').textContent = 'סה״כ: ' + money(totals.total);

  const message = $('#shipping-message');

  if (subtotal === 0) {
    message.textContent = 'הוסיפו מוצרים כדי להתחיל בהזמנה';
  } else if (subtotal >= FREE_SHIPPING_MIN) {
    message.textContent = '🎉 איזה כיף! קיבלתם משלוח חינם!';
  } else {
    const remaining = FREE_SHIPPING_MIN - subtotal;

    message.textContent =
      `🛍️ הוסיפו עוד ${money(remaining)} וקבלו משלוח חינם!`;
  }
}

// ==========================
// פתיחת טופס תשלום
// ==========================

function openPaymentForm() {
  const paymentSection = $('#payment-section');

  paymentSection.hidden = false;

  paymentSection.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

// ==========================
// הצגת המוצרים בסל
// ==========================

async function render() {
  try {
    products = await api('/api/products');

    const cart = getCart().filter(item =>
      products.some(p => p._id === item.productId)
    );

    setCart(cart);

    let subtotal = 0;

    if (cart.length === 0) {
      $('#cart-list').textContent =
        'הסל ריק. אפשר לבחור קינוחים בדף המוצרים.';

      updateSummary(0);

      // משאירים את הכפתור פעיל כדי להציג פופ-אפ
      $('#checkout').disabled = false;
      $('#payment-section').hidden = true;
      return;
    }

    $('#checkout').disabled = false;

    $('#cart-list').innerHTML = cart.map(item => {
      const product = products.find(
        p => p._id === item.productId
      );

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      return `
        <div class="cart-row">
          <div>
            <b>${escapeHtml(product.name)}</b>
            <p class="muted">${money(product.price)} ליחידה</p>
          </div>

          <label>
            כמות
            <input
              type="number"
              min="1"
              max="50"
              value="${item.quantity}"
              data-qty="${product._id}"
            >
          </label>

          <strong>${money(itemSubtotal)}</strong>

          <button
            class="btn small danger"
            data-remove="${product._id}">
            הסר
          </button>
        </div>
      `;
    }).join('');

    updateSummary(subtotal);

    // הסרת מוצר
    document.querySelectorAll('[data-remove]').forEach(button => {
      button.onclick = () => {
        const updatedCart = getCart().filter(
          item => item.productId !== button.dataset.remove
        );

        setCart(updatedCart);
        $('#payment-section').hidden = true;
        render();
      };
    });

    // שינוי כמות
    document.querySelectorAll('[data-qty]').forEach(input => {
      input.onchange = () => {
        const cart = getCart();

        const item = cart.find(
          x => x.productId === input.dataset.qty
        );

        if (!item) return;

        const product = products.find(
          p => p._id === item.productId
        );

        const available = Math.max(
          0,
          Number(product?.inStock) || 0
        );

        if (available === 0) {
          notify('המוצר אזל מהמלאי כרגע');
          render();
          return;
        }

        const requested = Number(input.value) || 1;

        item.quantity = Math.max(
          1,
          Math.min(50, available, requested)
        );

        if (requested > available) {
          notify('הכמות עודכנה בהתאם למלאי הזמין');
        }

        setCart(cart);

        $('#payment-section').hidden = true;
        render();
      };
    });

  } catch (error) {
    console.error('Cart loading error:', error);

    $('#cart-list').textContent =
      'לא הצלחנו לטעון את המוצרים. נסי לרענן את הדף.';

    notify(error.message);
  }
}

// ==========================
// לחיצה על המשך לתשלום
// ==========================

$('#checkout').onclick = () => {
  const cart = getCart();

  // סל ריק
  if (!cart.length) {
    showCartPopup({
      icon: '🛒',
      title: 'הסל שלך עדיין ריק!',
      message: 'עוד לא בחרת מתוקים. בואי למצוא משהו טעים!',
      actions: [
        {
          label: '🧁 בואי לבחור מתוקים',
          onClick: () => {
            window.location.href = 'products.html';
          }
        },
        {
          label: 'סגירה',
          secondary: true
        }
      ]
    });

    return;
  }

  // חישוב סכום המוצרים
  const subtotal = cart.reduce((sum, item) => {
    const product = products.find(
      p => p._id === item.productId
    );

    return sum + (
      product ? product.price * item.quantity : 0
    );
  }, 0);

  // פחות מ-300 ש"ח
  if (subtotal < FREE_SHIPPING_MIN) {
    const remaining = FREE_SHIPPING_MIN - subtotal;

    showCartPopup({
      icon: '🚚',
      title: 'רגע לפני התשלום!',
      message:
        `סכום המוצרים שלך: ${money(subtotal)}\n` +
        `דמי משלוח: ${money(SHIPPING_FEE)}\n` +
        `חסרים לך רק ${money(remaining)} למשלוח חינם 🎁`,
      actions: [
        {
          label: 'המשך לתשלום',
          onClick: openPaymentForm
        },
        {
          label: 'הוספת מוצרים',
          secondary: true,
          onClick: () => {
            window.location.href = 'products.html';
          }
        }
      ]
    });

    return;
  }

  // משלוח חינם
  showCartPopup({
    icon: '🎉',
    title: 'קיבלת משלוח חינם!',
    message: 'הגעת ל־₪300 ומעלה. המשלוח עלינו!',
    actions: [
      {
        label: 'המשך לתשלום',
        onClick: openPaymentForm
      },
      {
        label: 'סגירה',
        secondary: true
      }
    ]
  });
};

// ==========================
// שליחת ההזמנה לשרת
// ==========================

$('#payment-form').onsubmit = async event => {
  event.preventDefault();

  if (submitting) return;

  const items = getCart();

  if (!items.length) {
    showCartPopup({
      icon: '🛒',
      title: 'הסל שלך ריק',
      message: 'צריך להוסיף מוצרים לפני ביצוע הזמנה.',
      actions: [
        {
          label: 'מעבר למוצרים',
          onClick: () => {
            window.location.href = 'products.html';
          }
        }
      ]
    });

    return;
  }

  const fullName = $('#fullName').value.trim();
  const phone = $('#phone').value.trim();

  const city = $('#city').value.trim();
  const street = $('#street').value.trim();
  const houseNumber = $('#houseNumber').value.trim();
  const apartment = $('#apartment').value.trim();
  const notes = $('#notes').value.trim();

  const address = [
    city,
    street,
    houseNumber ? `מספר ${houseNumber}` : '',
    apartment ? `דירה ${apartment}` : ''
  ].filter(Boolean).join(', ');

  $('#address').value = address;

  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  )?.value;

  if (
    fullName.length < 2 ||
    !/^0\d{8,9}$/.test(phone) ||
    !city ||
    !street ||
    !houseNumber ||
    address.length < 5
  ) {
    showCartPopup({
      icon: '⚠️',
      title: 'חסרים פרטים',
      message: 'יש למלא שם, טלפון וכתובת משלוח תקינים.',
      actions: [
        {
          label: 'הבנתי'
        }
      ]
    });

    return;
  }

  submitting = true;

  const submitButton = $('#payment-form button[type="submit"]');

  submitButton.disabled = true;
  submitButton.textContent = 'מבצע הזמנה...';

  try {
    await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items,
        shipping: {
          fullName,
          phone,
          address,
          city,
          street,
          houseNumber,
          apartment,
          notes
        },
        paymentMethod
      })
    });

    setCart([]);
    window.location.href = 'orders.html';

  } catch (error) {
    console.error('Checkout error:', error);

    showCartPopup({
      icon: '⚠️',
      title: 'לא הצלחנו להשלים את ההזמנה',
      message: error.message,
      actions: [
        {
          label: 'סגירה'
        }
      ]
    });

  } finally {
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'אישור הזמנה';
  }
};

// ==========================
// טעינה ראשונית
// ==========================

render();
