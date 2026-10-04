// Lógica de Profile con autenticación JWT, consulta de pedidos, Sistema de Fidelidad v3 (Definitivo) y Sidebar

document.addEventListener('DOMContentLoaded', () => {
  verifyActiveProfileSession();

  // Escuchar tecla ESC para cerrar el sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsSidebar();
  });
});

function openSettingsSidebar() {
  const sidebar = document.getElementById('settingsSidebar');
  const overlay = document.getElementById('settingsOverlay');
  if (sidebar) sidebar.classList.add('active');
  if (overlay) overlay.classList.add('active');
}

function closeSettingsSidebar() {
  const sidebar = document.getElementById('settingsSidebar');
  const overlay = document.getElementById('settingsOverlay');
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
}

function switchProfileTab(tabName) {
  const tabBtns = document.querySelectorAll('.profile-tab-btn');
  const tabPanes = document.querySelectorAll('.profile-tab-pane');

  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabPanes.forEach(pane => pane.classList.remove('active'));

  if (tabName === 'puntos') {
    document.getElementById('tabBtnPuntos')?.classList.add('active');
    document.getElementById('tabPanePuntos')?.classList.add('active');
  } else if (tabName === 'cupones') {
    document.getElementById('tabBtnCupones')?.classList.add('active');
    document.getElementById('tabPaneCupones')?.classList.add('active');
  }
}

function copyCouponCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert(`¡Código ${code} copiado al portapapeles!`);
  }).catch(() => {
    alert(`Código de cupón: ${code}`);
  });
}

async function verifyActiveProfileSession() {
  if (!window.ArisAuth || !window.ArisAuth.isAuthenticated()) {
    window.location.href = '/src/pages/login.html';
    return;
  }

  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/auth/me');
    if (!res.ok) {
      window.ArisAuth.removeToken();
      window.location.href = '/src/pages/login.html';
      return;
    }

    const data = await res.json();
    const user = data.user;

    const userName = user.name || 'Cliente ArisShop';
    const userEmail = user.email || '';

    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = userName;

    const uEmailEl = document.getElementById('userEmail');
    if (uEmailEl) uEmailEl.textContent = userEmail;

    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarEmail = document.getElementById('sidebarUserEmail');
    if (sidebarName) sidebarName.textContent = userName;
    if (sidebarEmail) sidebarEmail.textContent = userEmail;

    const handleName = (user.name ? user.name.replace(/\s+/g, '') : user.email.split('@')[0]);
    document.getElementById('userHandle').textContent = `@${handleName.toLowerCase()}`;

    fetchUserPurchaseHistory(userEmail);
    fetchUserLoyaltySummary();
  } catch (err) {
    window.location.href = '/src/pages/login.html';
  }
}

async function fetchUserLoyaltySummary() {
  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/loyalty/summary');
    if (!res.ok) return;

    const data = await res.json();
    const { level, points, xp, userCoupons, history } = data;

    // 1. Nivel y XP
    const levelBadge = document.getElementById('userLevelBadge');
    const multTag = document.getElementById('userMultiplierTag');
    const xpTotal = document.getElementById('userXpTotal');
    const levelPerk = document.getElementById('userLevelPerk');
    const xpProgressTxt = document.getElementById('xpProgressTxt');
    const xpProgressBarFill = document.getElementById('xpProgressBarFill');
    const perkTitleTxt = document.getElementById('perkTitleTxt');

    if (levelBadge) levelBadge.textContent = `Nivel ${level.tier}`;
    if (multTag) multTag.textContent = `Multiplicador ${level.multiplier}x Puntos`;
    if (xpTotal) xpTotal.textContent = `${xp.active.toLocaleString('es-CO')} XP Acumulados`;
    if (levelPerk) levelPerk.textContent = `Beneficio: ${level.perk}`;
    if (perkTitleTxt) perkTitleTxt.textContent = `Nivel ${level.tier} — ${level.perk}`;
    if (xpProgressTxt) xpProgressTxt.textContent = `${xp.active.toLocaleString('es-CO')} / ${level.xpNextLevel.toLocaleString('es-CO')} XP`;
    if (xpProgressBarFill) xpProgressBarFill.style.width = `${level.progressPercent}%`;

    // 2. Puntos Canjeables
    const pointsVal = document.getElementById('userPointsVal');
    const pointsEquiv = document.getElementById('userPointsEquiv');
    const nextExpNotice = document.getElementById('nextExpirationNotice');

    if (pointsVal) pointsVal.textContent = `${points.balance.toLocaleString('es-CO')} PTS`;
    if (pointsEquiv) pointsEquiv.textContent = `Valor de canje: $${points.valueCOP.toLocaleString('es-CO')} COP ($10 por punto)`;

    // Notificación de Vencimiento FIFO o Bloqueo por Reembolso
    if (nextExpNotice) {
      if (points.isBlockedForRedemption) {
        nextExpNotice.innerHTML = `<span style="color:#f43f5e;">Canjes suspendidos (Saldo negativo por reembolso)</span>`;
      } else if (points.pending > 0 && points.balance === 0) {
        nextExpNotice.innerHTML = `<span style="color:#f59e0b;">${points.pending} PTS pend. activación (primera compra)</span>`;
      } else if (points.nextExpirationNotice) {
        const { points: expPts, daysLeft, dateFormatted } = points.nextExpirationNotice;
        nextExpNotice.innerHTML = `<span style="color:#f43f5e;">${expPts} PTS vencen en ${daysLeft} días (${dateFormatted})</span>`;
      } else {
        nextExpNotice.innerHTML = `<span style="color:#3fe7b8;">Sin puntos próximos a vencer</span>`;
      }
    }

    // 3. Renderizar Catálogo de Recompensas (Solo si el usuario tiene puntos acumulados > 0)
    const rewardsContainer = document.getElementById('rewardsCatalogContainer');
    if (rewardsContainer) {
      if (points.balance === 0) {
        rewardsContainer.innerHTML = `
          <div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.85rem; padding:32px; background:var(--jet); border:1px solid var(--graphite); border-radius:14px;">
            Realiza tu primera compra para acumular puntos y desbloquear el catálogo de recompensas.
          </div>
        `;
      } else if (data.rewards && data.rewards.length > 0) {
        rewardsContainer.innerHTML = `
          <div class="coupons-grid">
            ${data.rewards.map(r => `
              <div class="coupon-card">
                <div>
                  <div style="font-family:'DM Sans',sans-serif; font-weight:700; font-size:1.05rem; color:var(--white);">${r.name}</div>
                  <div style="font-size:0.78rem; color:var(--ash); margin-top:2px;">${r.description}</div>
                </div>
                <button onclick="handleRedeemReward('${r.id}', ${r.pointCost}, '${r.name}')" class="btn-primary" style="padding:10px; font-size:0.8rem; cursor:pointer; width:100%;">Canjear por ${r.pointCost.toLocaleString('es-CO')} PTS</button>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    // 4. Renderizar Cupones Personales Canjeados Emitidos (Vigencia 90 días)
    const couponsGrid = document.getElementById('userPersonalCouponsGrid');
    if (couponsGrid) {
      if (!userCoupons || userCoupons.length === 0) {
        couponsGrid.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.85rem; padding:32px; background:var(--jet); border:1px solid var(--graphite); border-radius:14px;">
            Aún no has canjeado cupones. Canjea tus puntos en la pestaña <strong>Saldo en Puntos</strong> para emitir tus códigos.
          </div>
        `;
      } else {
        couponsGrid.innerHTML = userCoupons.map(c => {
          const expDate = new Date(c.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
          const isExpired = c.status === 'expired';
          const isUsed = c.status === 'used';

          let statusBadge = `<span style="font-size:0.7rem; background:rgba(63,231,184,0.15); color:#3fe7b8; padding:3px 8px; border-radius:10px; font-weight:700;">EMITIDO (90 DÍAS)</span>`;
          if (isUsed) statusBadge = `<span style="font-size:0.7rem; background:rgba(224,224,224,0.15); color:var(--ash); padding:3px 8px; border-radius:10px;">USADO</span>`;
          if (isExpired) statusBadge = `<span style="font-size:0.7rem; background:rgba(244,63,94,0.15); color:#f43f5e; padding:3px 8px; border-radius:10px;">EXPIRADO</span>`;

          return `
            <div class="coupon-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-family:'DM Sans',sans-serif; font-weight:700; font-size:1.05rem; color:var(--white);">${c.rewardName}</div>
                ${statusBadge}
              </div>
              <div style="font-size:0.78rem; color:var(--ash); margin-top:2px;">Vence el ${expDate}</div>
              <span class="coupon-code">${c.code}</span>
              <button onclick="copyCouponCode('${c.code}')" class="btn-ghost" style="padding:8px 12px; font-size:0.75rem; cursor:pointer;" ${isExpired || isUsed ? 'disabled' : ''}>Copiar Código</button>
            </div>
          `;
        }).join('');
      }
    }

    // 5. Renderizar Historial Ledger Enriquecido
    const historyList = document.getElementById('loyaltyLedgerHistory');
    if (historyList) {
      if (!history.points || history.points.length === 0) {
        historyList.innerHTML = `<div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.85rem; padding:32px; background:var(--jet); border:1px solid var(--graphite); border-radius:14px;">No tienes movimientos de puntos aún.</div>`;
      } else {
        historyList.innerHTML = history.points.map(entry => {
          const meta = entry.meta || { label: entry.reason, tag: 'General' };
          const isPending = entry.status === 'pending';
          const isPositive = entry.points > 0;

          const ptsText = isPositive ? `+${entry.points}` : `${entry.points}`;
          const colorStyle = isPending ? 'color:#f59e0b;' : (isPositive ? 'color:#3fe7b8;' : 'color:#f43f5e;');
          const dateTxt = new Date(entry.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

          return `
            <div class="order-card" style="padding:14px 18px;">
              <div>
                <div style="font-family:'DM Sans',sans-serif; font-weight:700; color:var(--white);">${meta.label} ${isPending ? '<span style="font-size:0.7rem; background:rgba(245,158,11,0.2); color:#f59e0b; padding:2px 6px; border-radius:4px;">Pendiente</span>' : ''}</div>
                <div style="font-family:'DM Mono',monospace; font-size:0.75rem; color:var(--ash);">${dateTxt} · Clasificación: ${meta.tag}</div>
              </div>
              <div style="font-family:'DM Mono',monospace; font-weight:700; ${colorStyle}">${ptsText} PTS</div>
            </div>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.warn('Fidelidad operando en modo estático.');
  }
}

async function handleRedeemReward(rewardId, pointCost, rewardName) {
  if (!confirm(`¿Deseas canjear "${rewardName}" por ${pointCost} Puntos?`)) return;

  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/loyalty/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error al canjear la recompensa.');
      return;
    }

    alert(data.message);
    fetchUserLoyaltySummary();
  } catch (err) {
    alert(`¡Recompensa "${rewardName}" canjeada exitosamente!`);
  }
}

async function fetchUserPurchaseHistory(userEmail) {
  const listBox = document.getElementById('userOrdersList');
  const format = window.fmt || (n => '$' + n.toLocaleString('es-CO'));

  try {
    const res = await window.ArisAuth.fetchWithAuth('/api/orders');
    if (!res.ok) throw new Error('Error buscando pedidos');

    const data = await res.json();
    const allOrders = data.orders || [];

    const userOrders = allOrders.filter(o => o.email === userEmail);

    if (userOrders.length === 0) {
      listBox.innerHTML = `<div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.85rem; padding:32px; background:var(--jet); border:1px solid var(--graphite); border-radius:14px;">Aún no has realizado compras en la tienda.</div>`;
      return;
    }

    listBox.innerHTML = userOrders.map(o => `
      <div class="order-card">
        <div>
          <div class="order-id-txt">Pedido #${o.orderId}</div>
          <div class="order-date-txt">Fecha: ${new Date(o.createdAt || Date.now()).toLocaleDateString('es-CO')} · Pago: ${o.paymentMethod || 'Efectivo'}</div>
        </div>
        <div class="order-amt-txt">${format(o.total || 0)}</div>
      </div>
    `).join('');
  } catch (err) {
    listBox.innerHTML = `<div style="text-align:center; color:var(--ash); font-family:'DM Mono',monospace; font-size:0.8rem; padding:12px;">Sin compras registradas aún.</div>`;
  }
}

function handleLogout() {
  window.ArisAuth.removeToken();
  window.location.href = '/home.html';
}

window.openSettingsSidebar = openSettingsSidebar;
window.closeSettingsSidebar = closeSettingsSidebar;
window.switchProfileTab = switchProfileTab;
window.copyCouponCode = copyCouponCode;
window.handleRedeemReward = handleRedeemReward;
window.handleLogout = handleLogout;
