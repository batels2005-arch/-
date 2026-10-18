
async function loadOrders() {
  const container = document.querySelector('#orders');

  try {
    const orders = await api('/api/orders/my');

    if (!orders.length) {
      container.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon">🛍️</div>
          <h3>עדיין אין לך הזמנות</h3>
          <p>זה הזמן לבחור משהו מתוק!</p>
          <a href="products.html" class="btn">
            לצפייה במוצרים
          </a>
        </div>
      `;
      return;
    }

    const statusLabels = {
      pending: 'בהכנה',
      completed: 'הושלמה',
      cancelled: 'בוטלה'
    };

    const paymentLabels = {
      cash: '💵 מזומן בעת המסירה',
      card_demo: '💳 כרטיס אשראי — הדמיה בלבד'
    };

    const paymentStatusLabels = {
      unpaid: 'ממתין לתשלום',
      demo: 'תשלום מדומה — ללא חיוב אמיתי'
    };

    container.innerHTML = orders.map(order => {
      const status = statusLabels[order.status] || 'בטיפול';

      const statusClass =
        ['pending', 'completed', 'cancelled'].includes(order.status)
          ? order.status
          : 'pending';

      const date = new Date(order.createdAt)
        .toLocaleDateString('he-IL');

      const items = Array.isArray(order.items)
        ? order.items
        : [];

      const itemsHtml = items.map(item => `
        <div class="order-product-row">
          <span>
            ${escapeHtml(item.name || 'מוצר')}
            × ${Number(item.quantity) || 0}
          </span>
          <strong>
            ${money(
              (Number(item.price) || 0) *
              (Number(item.quantity) || 0)
            )}
          </strong>
        </div>
      `).join('');

      // תמיכה בהזמנות ישנות שאין בהן subtotal
      const calculatedSubtotal = items.reduce(
        (sum, item) =>
          sum +
          (Number(item.price) || 0) *
          (Number(item.quantity) || 0),
        0
      );

      const subtotal = Number.isFinite(Number(order.subtotal))
        && order.subtotal != null
          ? Number(order.subtotal)
          : calculatedSubtotal;

      // לא מניחים דמי משלוח בהזמנות ישנות
      const hasShippingFee =
        order.shippingFee != null &&
        Number.isFinite(Number(order.shippingFee));

      const shippingFee = hasShippingFee
        ? Number(order.shippingFee)
        : null;

      const paymentMethod =
        paymentLabels[order.paymentMethod] ||
        'לא צוין';

      const paymentStatus =
        paymentStatusLabels[order.paymentStatus] ||
        'לא צוין';

      const customer = order.customer || {};

      const addressHtml = customer.address
        ? `
          <div class="order-detail-line">
            <span>🚚 כתובת למשלוח</span>
            <strong>${escapeHtml(customer.address)}</strong>
          </div>
        `
        : '';

      const notesHtml = customer.notes
        ? `
          <div class="order-detail-line">
            <span>📝 הערות לשליח</span>
            <strong>${escapeHtml(customer.notes)}</strong>
          </div>
        `
        : '';

      return `
        <article class="order-card">

          <div class="order-card-header">
            <div>
              <h3>
                הזמנה #${escapeHtml(
                  String(order._id).slice(-6).toUpperCase()
                )}
              </h3>
              <p>📅 ${date}</p>
            </div>

            <span class="order-status ${statusClass}">
              ${status}
            </span>
          </div>

          <div class="order-card-body">
            <h4>🧁 פריטים בהזמנה</h4>
            ${itemsHtml}

            <div class="order-price-breakdown">

              <div class="order-detail-line">
                <span>סכום המוצרים</span>
                <strong>${money(subtotal)}</strong>
              </div>

              <div class="order-detail-line">
                <span>🚚 דמי משלוח</span>
                <strong>
                  ${
                    shippingFee === null
                      ? 'לא פורט בהזמנה ישנה'
                      : shippingFee === 0
                        ? 'חינם 🎁'
                        : money(shippingFee)
                  }
                </strong>
              </div>

            </div>

            <div class="order-payment-details">
              <h4>💳 פרטי תשלום ומשלוח</h4>

              <div class="order-detail-line">
                <span>אמצעי תשלום</span>
                <strong>${paymentMethod}</strong>
              </div>

              <div class="order-detail-line">
                <span>סטטוס תשלום</span>
                <strong>${paymentStatus}</strong>
              </div>

              ${addressHtml}
              ${notesHtml}
            </div>
          </div>

          <div class="order-card-footer">
            <span>סה״כ לתשלום</span>
            <strong>${money(order.total)}</strong>
          </div>

        </article>
      `;
    }).join('');

  } catch (error) {
    console.error('Orders loading error:', error);

    container.innerHTML = `
      <div class="orders-empty">
        <h3>לא ניתן לטעון את ההזמנות</h3>
        <p>ודאי שאת מחוברת לחשבון ונסי לרענן.</p>
      </div>
    `;

    notify(error.message);
  }
}

loadOrders();
