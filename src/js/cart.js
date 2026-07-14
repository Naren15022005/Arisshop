// Cart manager: centralizes cart state and UI, persists to localStorage
(function(){
  const KEY = 'aris_cart_v1';
  const WHATSAPP_URL = 'https://wa.me/573125102503';
  let cart = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      cart = raw ? JSON.parse(raw) : [];
    } catch (e) { cart = []; }
    updateCartUI();
    setupCheckout();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function addToCart(id, qty = 1) {
    const p = (window.ALL || []).find(x => x.id === id);
    if (!p) return;
    const ex = cart.find(i => i.id === id);
    if (ex) ex.qty += qty;
    else cart.push({...p, qty});
    persist();
    updateCartUI();
    openCart();
  }

  function changeQty(id, delta) {
    const i = cart.find(x => x.id === id);
    if (!i) return;
    i.qty += delta;
    if (i.qty <= 0) cart = cart.filter(x => x.id !== id);
    persist();
    updateCartUI();
  }

  function updateCartUI() {
    const count = cart.reduce((a,i) => a + i.qty, 0);
    const total = cart.reduce((a,i) => a + i.price * i.qty, 0);
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = count;
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.textContent = window.fmt ? window.fmt(total) : '$' + total.toLocaleString('es-CO');
    const emptyMsg = document.getElementById('cartEmptyMsg') || document.getElementById('cartEmpty');
    if (emptyMsg) emptyMsg.style.display = cart.length ? 'none' : 'block';
    const container = document.getElementById('cartItemsEl') || document.getElementById('cartItems');
    if (container) {
      const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));
      container.innerHTML = cart.map(i => `
        <div class="cart-item">
          <div class="cart-item-thumb" style="${i.img ? `background-image:url('${i.img}')` : ''}">${i.img ? '' : '<span class="img-placeholder">Img</span>'}</div>
          <div class="cart-item-info">
            <div class="cart-item-name">${i.name}</div>
            <div class="cart-item-price">${format(i.price)}</div>
            <div class="cart-item-qty">
              <button class="qty-b" onclick="changeQty(${i.id},-1)">−</button>
              <span class="qty-n">${i.qty}</span>
              <button class="qty-b" onclick="changeQty(${i.id},1)">+</button>
            </div>
          </div>
          <button class="cart-item-del" onclick="changeQty(${i.id},-99)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      `).join('');
    }
  }

  function getCartItems() {
    return cart.map(item => ({ ...item }));
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function openCheckoutModal() {
    if (!cart.length) {
      alert('Tu carrito está vacío. Agrega productos antes de finalizar la compra.');
      return;
    }
    createCheckoutModal();
    const totalEl = document.getElementById('checkoutTotalValue');
    if (totalEl) {
      totalEl.textContent = window.fmt ? window.fmt(getCartTotal()) : '$' + getCartTotal().toLocaleString('es-CO');
    }
    document.getElementById('checkoutOverlay')?.classList.add('open');
    document.getElementById('checkoutModal')?.classList.add('open');
  }

  function closeCheckoutModal() {
    document.getElementById('checkoutOverlay')?.classList.remove('open');
    document.getElementById('checkoutModal')?.classList.remove('open');
  }

  function setupCheckout() {
    createCheckoutModal();
    const buttons = document.querySelectorAll('.checkout-btn, .checkout-btn-main');
    buttons.forEach(btn => {
      btn.addEventListener('click', event => {
        event.preventDefault();
        openCheckoutModal();
      });
    });
  }

  function createCheckoutModal() {
    if (document.getElementById('checkoutModal')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="checkoutOverlay" class="checkout-overlay"></div>
      <div id="checkoutModal" class="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
        <button id="checkoutClose" class="checkout-close" type="button" aria-label="Cerrar checkout">×</button>
        <div class="checkout-header">
          <h2 id="checkoutTitle">Finalizar compra</h2>
          <p>Completa tus datos y selecciona un medio de pago. No se realiza cobro automático.</p>
        </div>
        <form id="checkoutForm" class="checkout-form">
          <div class="checkout-row">
            <label for="checkoutName">Nombre completo</label>
            <input id="checkoutName" name="name" type="text" required placeholder="Tu nombre completo" />
          </div>
          <div class="checkout-row">
            <label for="checkoutEmail">Correo electrónico</label>
            <input id="checkoutEmail" name="email" type="email" required placeholder="ejemplo@correo.com" />
          </div>
          <div class="checkout-row">
            <label for="checkoutPhone">Teléfono</label>
            <input id="checkoutPhone" name="phone" type="tel" required placeholder="312 XXX XXXX" />
          </div>
          <div class="checkout-row">
            <label for="checkoutAddress">Dirección aproximada</label>
            <textarea id="checkoutAddress" name="address" rows="3" required placeholder="Ciudad, barrio o sector"></textarea>
          </div>
          <fieldset class="checkout-fieldset">
            <legend>Medio de pago</legend>
            <label><input type="radio" name="paymentMethod" value="Nequi" checked /> Nequi</label>
            <label><input type="radio" name="paymentMethod" value="Bancolombia" /> Bancolombia</label>
          </fieldset>
          <div class="checkout-summary">
            <div class="summary-label">Total a pagar</div>
            <div id="checkoutTotalValue" class="summary-value">${window.fmt ? window.fmt(getCartTotal()) : '$' + getCartTotal().toLocaleString('es-CO')}</div>
          </div>
          <button class="checkout-submit-btn" type="submit">Generar factura y enviar WhatsApp</button>
        </form>
      </div>
    `;
    document.body.appendChild(wrapper);

    const style = document.createElement('style');
    style.textContent = `
      .checkout-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease;
        z-index: 9999;
      }
      .checkout-overlay.open { opacity: 1; pointer-events: auto; }
      .checkout-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(.97);
        width: min(680px, calc(100vw - 32px));
        max-height: 90vh;
        overflow-y: auto;
        background: #fff;
        border-radius: 22px;
        box-shadow: 0 30px 80px rgba(0,0,0,.22);
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease, transform .2s ease;
        z-index: 10000;
        padding: 28px;
      }
      .checkout-modal.open {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
      }
      .checkout-close {
        position: absolute;
        top: 16px;
        right: 16px;
        border: none;
        background: transparent;
        font-size: 26px;
        cursor: pointer;
      }
      .checkout-header h2 { margin: 0 0 8px; font-size: 1.35rem; }
      .checkout-header p { margin: 0 0 18px; color: #555; line-height: 1.5; }
      .checkout-form { display: grid; gap: 14px; }
      .checkout-row label { display: block; margin-bottom: 6px; font-size: .95rem; color: #333; }
      .checkout-row input, .checkout-row textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 14px; font-size: .95rem; color: #111; background: #fdfdfd; }
      .checkout-row textarea { resize: vertical; }
      .checkout-fieldset { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; display: grid; gap: 10px; color: #333; }
      .checkout-fieldset legend { font-size: .95rem; padding: 0 8px; }
      .checkout-fieldset label { display: flex; align-items: center; gap: 10px; font-size: .95rem; }
      .checkout-summary { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; }
      .summary-label { color: #555; font-size: .95rem; }
      .summary-value { font-weight: 700; font-size: 1.05rem; }
      .checkout-submit-btn { width: 100%; border: none; border-radius: 14px; padding: 14px 18px; background: #222; color: #fff; font-size: 1rem; cursor: pointer; }
      .checkout-submit-btn:hover { background: #111; }
    `;
    document.head.appendChild(style);

    document.getElementById('checkoutClose')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutOverlay')?.addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutForm')?.addEventListener('submit', handleCheckoutSubmit);
  }

  function handleCheckoutSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    const paymentMethod = form.paymentMethod.value;

    if (!name || !email || !phone || !address || !paymentMethod) {
      alert('Por favor completa todos los datos del formulario.');
      return;
    }

    const orderData = {
      name,
      email,
      phone,
      address,
      paymentMethod,
      total: getCartTotal(),
      date: new Date().toISOString(),
      items: getCartItems().map(item => ({ id: item.id, name: item.name, qty: item.qty, price: item.price }))
    };

    const created = createInvoicePdf(orderData);
    if (created) {
      clearCart();
      closeCheckoutModal();
      openWhatsApp(orderData);
      alert('Factura generada y WhatsApp abierto. Revisa tu navegador.');
    }
  }

  function clearCart() {
    cart = [];
    persist();
    updateCartUI();
  }

  function createInvoicePdf(data) {
    try {
      const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
      if (!jsPDF) {
        alert('No se pudo generar la factura porque falta la librería jsPDF.');
        return false;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = 50;
      const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Factura de compra', margin, y);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Factura #${Date.now().toString().slice(-6)}`, pageWidth - margin, y, { align: 'right' });
      y += 18;
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date().toLocaleString('es-CO')}`, margin, y);
      doc.text(`Medio de pago: ${data.paymentMethod}`, pageWidth - margin, y, { align: 'right' });
      y += 18;
      doc.setDrawColor(220);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 28;

      // Customer info
      doc.setTextColor(34);
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente', margin, y);
      doc.text('Pedido', pageWidth - margin, y, { align: 'right' });
      y += 16;
      doc.setFont('helvetica', 'normal');
      const customerLines = [
        `Nombre: ${data.name}`,
        `Email: ${data.email}`,
        `Teléfono: ${data.phone}`
      ];
      const orderLines = [
        `Dirección: ${data.address}`,
        `Total: ${format(data.total)}`,
        `Estado: Pendiente`
      ];
      doc.text(customerLines, margin, y);
      doc.text(orderLines, pageWidth - margin, y, { align: 'right' });
      y += 70;

      // Products header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const productX = margin;
      const quantityX = 340;
      const priceX = 430;
      const totalX = pageWidth - margin;
      doc.text('Producto', productX, y);
      doc.text('Cantidad', quantityX, y, { align: 'center' });
      doc.text('Precio', priceX, y, { align: 'right' });
      doc.text('Total', totalX, y, { align: 'right' });
      y += 12;
      doc.setDrawColor(180);
      doc.setLineWidth(0.7);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;

      // Products rows
      doc.setFont('helvetica', 'normal');
      data.items.forEach(item => {
        const itemLines = doc.splitTextToSize(item.name, 240);
        const rowHeight = 16 * itemLines.length;
        if (y + rowHeight > 740) {
          doc.addPage();
          y = 60;
        }
        doc.text(itemLines, productX, y);
        doc.text(item.qty.toString(), quantityX, y, { align: 'center' });
        doc.text(format(item.price), priceX, y, { align: 'right' });
        doc.text(format(item.price * item.qty), totalX, y, { align: 'right' });
        y += rowHeight + 8;
      });

      // Totals block
      doc.setDrawColor(220);
      doc.setLineWidth(0.7);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18;
      doc.setFont('helvetica', 'bold');
      doc.text('Total factura:', margin, y);
      doc.text(format(data.total), totalX, y, { align: 'right' });
      y += 34;

      // QR block
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Datos del pedido en QR:', margin, y);
      const qrImage = generateQrDataUrl(JSON.stringify(data));
      if (qrImage) {
        doc.addImage(qrImage, 'PNG', margin, y + 16, 140, 140);
      } else {
        doc.text('QR no disponible en este navegador.', margin, y + 20);
      }
      y += 170;

      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text('Nota: este documento es una factura simulada generada por ArisShop. El pago se gestiona fuera de esta aplicación.', margin, y);

      doc.save(`Factura-ArisShop-${Date.now()}.pdf`);
      return true;
    } catch (error) {
      console.error(error);
      alert('Ocurrió un error generando la factura.');
      return false;
    }
  }

  function generateQrDataUrl(payload) {
    if (window.QRious) {
      try {
        const qr = new QRious({ value: payload, size: 240, level: 'H' });
        return qr.toDataURL('image/png');
      } catch (err) {
        console.warn('Error generando QR', err);
      }
    }
    return null;
  }

  function openWhatsApp(data) {
    const lines = [
      'Nuevo pedido ArisShop',
      `Nombre: ${data.name}`,
      `Email: ${data.email}`,
      `Teléfono: ${data.phone}`,
      `Dirección: ${data.address}`,
      `Medio de pago: ${data.paymentMethod}`,
      `Total: ${window.fmt ? window.fmt(data.total) : '$' + data.total.toLocaleString('es-CO')}`,
      'Productos:'
    ];
    data.items.forEach(item => {
      lines.push(`${item.qty} x ${item.name} = ${window.fmt ? window.fmt(item.price * item.qty) : '$' + (item.price * item.qty).toLocaleString('es-CO')}`);
    });
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`${WHATSAPP_URL}?text=${text}`, '_blank');
  }

  function openCart()  { const d = document.getElementById('cartDrawer'); const bg = document.getElementById('cartBg') || document.getElementById('cartOverlay'); if (d) d.classList.add('open'); if (bg) bg.classList.add('open'); }
  function closeCart() { const d = document.getElementById('cartDrawer'); const bg = document.getElementById('cartBg') || document.getElementById('cartOverlay'); if (d) d.classList.remove('open'); if (bg) bg.classList.remove('open'); }
  function toggleCart() {
    const d = document.getElementById('cartDrawer');
    const bg = document.getElementById('cartBg') || document.getElementById('cartOverlay');
    if (d) d.classList.toggle('open');
    if (bg) bg.classList.toggle('open');
  }

  // Expose globally for existing inline handlers
  window.addToCart = addToCart;
  window.changeQty = changeQty;
  window.updateCartUI = updateCartUI;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.toggleCart = toggleCart;

  // Initialize
  document.addEventListener('DOMContentLoaded', load);
})();
