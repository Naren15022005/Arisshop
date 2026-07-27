// LoyaltyBalanceService.js — Fuente Única de Verdad (Single Source of Truth) para Puntos y XP en ArisShop
// 
// DOCUMENTACIÓN Y ARQUITECTURA DE SEGURIDAD FINANCIERA:
// 1. Todo balance mostrado en la UI y API se calcula en tiempo real mediante la agregación matemática directa
//    SUM(points) y SUM(xp) desde los libros contables (PointsLedger y XpLedger).
// 2. NINGÚN componente o endpoint puede tener un cálculo paralelo o leer de campos desnormalizados desincronizados.
// 3. Los libros contables son APPEND-ONLY: nunca se realiza UPDATE ni DELETE sobre registros pasados. Cualquier
//    corrección debe realizarse insertando un registro de ajuste contable (reasonKey: 'adjustment' o 'reversal').
// 4. Cada movimiento almacena un SNAPSHOT de las condiciones financieras de la transacción (pointValueCOP, earnPercent).

const loyaltyConfig = {
  pointValueCOP: 10,
  minPointsToRedeem: 100,
  maxRedeemPercent: 30,
  expirationDays: 365,
  couponExpirationDays: 90,
  reversalBlockThreshold: 500
};

const levelTiers = [
  { name: 'Bronce', xpRequired: 0, multiplier: 1.0, perk: 'Nivel Inicial · Descuentos Exclusivos' },
  { name: 'Plata', xpRequired: 500, multiplier: 1.1, perk: 'Multiplicador 1.1x · Envío gratis desde $150.000 COP' },
  { name: 'Oro', xpRequired: 2000, multiplier: 1.25, perk: 'Multiplicador 1.25x · Acceso anticipado a lanzamientos' },
  { name: 'Diamante', xpRequired: 6000, multiplier: 1.5, perk: 'Multiplicador 1.5x · Soporte prioritario + Regalo de cumpleaños' }
];

const REASON_META = {
  purchase: { label: 'Compra realizada', tag: 'Costo de Venta' },
  welcome_bonus: { label: 'Bono de bienvenida', tag: 'Adquisición' },
  referral: { label: 'Referido exitoso', tag: 'Adquisición' },
  review: { label: 'Reseña con foto', tag: 'Retención' },
  event_multiplier: { label: 'Bono evento x2', tag: 'Evento' },
  expired: { label: 'Puntos vencidos', tag: 'Vencimiento' },
  redeemed: { label: 'Canje de recompensa', tag: 'Canje' },
  reversal: { label: 'Reversión por reembolso', tag: 'Ajuste' },
  adjustment: { label: 'Ajuste contable', tag: 'Auditoría' }
};

// Libros Contables Append-Only en Memoria
const pointsLedgers = [];
const xpLedgers = [];
const redemptions = [];
const userCoupons = [];
const processedOrderIds = new Set(); // Registro de idempotencia

const rewardCatalog = [
  { id: 'rew_1', name: 'Mousepad ArisShop Élite (80x30cm)', type: 'physical_product', pointCost: 500, description: 'Mousepad de tela microtexturizada antideslizante' },
  { id: 'rew_2', name: 'Cupón de Descuento $15.000 COP', type: 'coupon', pointCost: 1500, description: 'Válido por 90 días en cualquier compra' },
  { id: 'rew_3', name: 'Envío Gratis Nacional', type: 'free_shipping', pointCost: 800, description: 'Cubre el costo de envío por 90 días' },
  { id: 'rew_4', name: 'Cupón 10% OFF (Tope $50.000)', type: 'coupon', pointCost: 1000, description: '10% de descuento en el total de tu pedido' },
  { id: 'rew_5', name: 'SSD M.2 NVMe 256GB High-Speed', type: 'physical_product', pointCost: 4500, description: 'Almacenamiento ultra rápido para tu PC/Laptop' }
];

const LoyaltyBalanceService = {
  getLoyaltyConfig() {
    return { ...loyaltyConfig };
  },

  getRewardCatalog() {
    return [...rewardCatalog];
  },

  // Helper: Obtener Nivel del usuario desde el XP activo acumulado
  getUserLevel(activeXp) {
    let currentTier = levelTiers[0];
    let nextTier = levelTiers[1];

    for (let i = 0; i < levelTiers.length; i++) {
      if (activeXp >= levelTiers[i].xpRequired) {
        currentTier = levelTiers[i];
        nextTier = levelTiers[i + 1] || null;
      }
    }

    const xpCurrentLevel = currentTier.xpRequired;
    const xpNextLevel = nextTier ? nextTier.xpRequired : currentTier.xpRequired;
    const progressPercent = nextTier
      ? Math.min(100, Math.round(((activeXp - xpCurrentLevel) / (xpNextLevel - xpCurrentLevel)) * 100))
      : 100;

    return {
      tier: currentTier.name,
      multiplier: currentTier.multiplier,
      perk: currentTier.perk,
      totalXp: activeXp,
      xpCurrentLevel,
      xpNextLevel,
      progressPercent
    };
  },

  // Inicializar Bono de Bienvenida en estado 'pending' (100 PTS / 50 XP) si no existe
  initWelcomeBonusIfNeeded(userEmail) {
    const existingXp = xpLedgers.some(x => x.userEmail === userEmail && x.reasonKey === 'welcome_bonus');
    if (!existingXp) {
      const createdAt = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + loyaltyConfig.expirationDays);

      // Append-Only entry en XpLedger
      xpLedgers.push({
        id: 'xp_welcome_' + Date.now(),
        userEmail,
        xp: 50,
        reasonKey: 'welcome_bonus',
        reason: REASON_META.welcome_bonus.label,
        status: 'pending', // Bloqueado hasta completar la 1ra compra
        createdAt
      });

      // Append-Only entry en PointsLedger con Snapshot Financiero
      pointsLedgers.push({
        id: 'led_welcome_' + Date.now(),
        userEmail,
        points: 100,
        pointValueCOP: loyaltyConfig.pointValueCOP, // Snapshot
        reasonKey: 'welcome_bonus',
        reason: REASON_META.welcome_bonus.label,
        status: 'pending', // Bloqueado hasta completar la 1ra compra
        expiresAt: expiresAt.toISOString(),
        createdAt
      });
    }
  },

  // FUENTE ÚNICA DE VERDAD: Agregación de Balances de Puntos y XP
  calculateUserSummary(userEmail) {
    this.initWelcomeBonusIfNeeded(userEmail);
    const now = new Date();

    // 1. Agregación de XP (solo status === 'available')
    const userXpEntries = xpLedgers.filter(x => x.userEmail === userEmail);
    let activeXp = 0;
    let pendingXp = 0;

    userXpEntries.forEach(entry => {
      if (entry.status === 'available') {
        activeXp += entry.xp;
      } else if (entry.status === 'pending') {
        pendingXp += entry.xp;
      }
    });

    // 2. Agregación de Puntos (solo status === 'available')
    const userPointsEntries = pointsLedgers.filter(p => p.userEmail === userEmail);
    let activePoints = 0;
    let pendingPoints = 0;
    let rawBalance = 0;
    let nextExpiringLot = null;

    userPointsEntries.forEach(entry => {
      rawBalance += entry.points;
      if (entry.status === 'available') {
        if (entry.points > 0) {
          const isExpired = entry.expiresAt && new Date(entry.expiresAt) < now;
          if (!isExpired) {
            activePoints += entry.points;
            if (!nextExpiringLot || new Date(entry.expiresAt) < new Date(nextExpiringLot.expiresAt)) {
              nextExpiringLot = entry;
            }
          }
        } else {
          activePoints += entry.points; // Canjes/Ajustes negativos
        }
      } else if (entry.status === 'pending') {
        pendingPoints += entry.points;
      }
    });

    const levelInfo = this.getUserLevel(activeXp);
    const pointsValueCOP = Math.max(0, activePoints) * loyaltyConfig.pointValueCOP;
    const isBlockedForRedemption = rawBalance < 0 && Math.abs(rawBalance) >= loyaltyConfig.reversalBlockThreshold;

    let nextExpirationNotice = null;
    if (nextExpiringLot) {
      const expDate = new Date(nextExpiringLot.expiresAt);
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      nextExpirationNotice = {
        points: nextExpiringLot.points,
        daysLeft: diffDays,
        dateFormatted: expDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    }

    // Cupones personales emitidos
    const myCoupons = userCoupons
      .filter(c => c.userEmail === userEmail)
      .map(c => {
        const isExpired = c.status === 'issued' && new Date(c.expiresAt) < now;
        return { ...c, status: isExpired ? 'expired' : c.status };
      });

    // Historial con metadatos
    const pointsHistory = userPointsEntries.map(p => ({
      ...p,
      meta: REASON_META[p.reasonKey] || { label: p.reason, icon: '📜', tag: 'General' }
    }));

    return {
      config: loyaltyConfig,
      level: levelInfo,
      points: {
        balance: Math.max(0, activePoints),
        pending: pendingPoints,
        rawBalance,
        valueCOP: pointsValueCOP,
        isBlockedForRedemption,
        nextExpirationNotice
      },
      xp: {
        active: activeXp,
        pending: pendingXp
      },
      userCoupons: myCoupons,
      rewards: rewardCatalog,
      history: {
        points: pointsHistory
      }
    };
  },

  // Flujo Completo de Canje con Emisión de Cupón de 90 Días
  redeemReward(userEmail, rewardId) {
    const reward = rewardCatalog.find(r => r.id === rewardId);
    if (!reward) throw new Error('Recompensa no encontrada.');

    const summary = this.calculateUserSummary(userEmail);
    if (summary.points.isBlockedForRedemption) {
      throw new Error('Canjes suspendidos temporalmente debido a saldo negativo por reembolso de pedido.');
    }

    if (summary.points.balance < reward.pointCost) {
      throw new Error(`Puntos insuficientes. Necesitas ${reward.pointCost} PTS y tienes ${summary.points.balance} PTS disponibles.`);
    }

    const createdAt = new Date().toISOString();

    // 1. Append-Only Ledger Entry (Puntos Negativos)
    const ledgerEntry = {
      id: 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      userEmail,
      points: -reward.pointCost,
      pointValueCOP: loyaltyConfig.pointValueCOP, // Snapshot
      reasonKey: 'redeemed',
      reason: `Canje: ${reward.name}`,
      status: 'available',
      createdAt
    };
    pointsLedgers.push(ledgerEntry);

    // 2. Registro de Canje
    const redemptionId = 'red_' + Date.now();
    redemptions.push({
      id: redemptionId,
      userEmail,
      rewardId: reward.id,
      rewardName: reward.name,
      status: 'issued',
      createdAt
    });

    // 3. Emisión de Cupón Único (Vigencia 90 días)
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couponCode = reward.type === 'free_shipping' ? `FREESHIP-${randomStr}` : `ARIS-${randomStr}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + loyaltyConfig.couponExpirationDays);

    const coupon = {
      id: 'coup_' + Date.now(),
      redemptionId,
      userEmail,
      rewardName: reward.name,
      type: reward.type,
      code: couponCode,
      status: 'issued',
      expiresAt: expiresAt.toISOString(),
      createdAt
    };
    userCoupons.push(coupon);

    const updatedSummary = this.calculateUserSummary(userEmail);
    return {
      message: `¡Recompensa "${reward.name}" canjeada con éxito! Código: ${couponCode}`,
      reward,
      coupon,
      newBalance: updatedSummary.points.balance
    };
  },

  // Acreditación Idempotente por Compra Confirmada
  processOrderAccreditation({ userEmail, orderId, totalCOP }) {
    if (!userEmail || !totalCOP) return null;

    // Control de Idempotencia: Evitar procesar el mismo pedido dos veces
    if (orderId && processedOrderIds.has(orderId)) {
      console.log(`ℹ️ Idempotencia: El pedido #${orderId} ya acreditó sus puntos anteriormente.`);
      return null;
    }
    if (orderId) processedOrderIds.add(orderId);

    this.initWelcomeBonusIfNeeded(userEmail);

    // 1. Activar Bono de Bienvenida (pending -> available) en la primera compra
    pointsLedgers.forEach(entry => {
      if (entry.userEmail === userEmail && entry.reasonKey === 'welcome_bonus' && entry.status === 'pending') {
        entry.status = 'available';
      }
    });

    xpLedgers.forEach(entry => {
      if (entry.userEmail === userEmail && entry.reasonKey === 'welcome_bonus' && entry.status === 'pending') {
        entry.status = 'available';
      }
    });

    // 2. Acreditar XP ($10.000 COP = +1 XP)
    const earnedXp = Math.floor(totalCOP / 10000);
    const createdAt = new Date().toISOString();

    if (earnedXp > 0) {
      xpLedgers.push({
        id: 'xp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        userEmail,
        orderId,
        xp: earnedXp,
        reasonKey: 'purchase',
        reason: REASON_META.purchase.label,
        status: 'available',
        createdAt
      });
    }

    // 3. Acreditar Puntos por Compra con Snapshot Financiero
    const currentSummary = this.calculateUserSummary(userEmail);
    const earnPercent = 0.02; // 2% Devolución base
    const baseDevolutionCOP = totalCOP * earnPercent;
    const pointsEarned = Math.min(
      500, // Tope máximo por unidad/pedido
      Math.round((baseDevolutionCOP * currentSummary.level.multiplier) / loyaltyConfig.pointValueCOP)
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + loyaltyConfig.expirationDays);

    if (pointsEarned > 0) {
      pointsLedgers.push({
        id: 'led_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        userEmail,
        orderId,
        points: pointsEarned,
        pointValueCOP: loyaltyConfig.pointValueCOP, // Snapshot
        earnPercent, // Snapshot
        reasonKey: 'purchase',
        reason: REASON_META.purchase.label,
        status: 'available',
        expiresAt: expiresAt.toISOString(),
        createdAt
      });
    }

    return { earnedXp, pointsEarned };
  },

  // Ajuste Contable Append-Only (para corrección de datos o reversiones sin sobrescribir el pasado)
  addAdjustmentEntry({ userEmail, points = 0, xp = 0, reasonNote = 'Ajuste contable' }) {
    const createdAt = new Date().toISOString();

    if (points !== 0) {
      pointsLedgers.push({
        id: 'led_adj_' + Date.now(),
        userEmail,
        points,
        pointValueCOP: loyaltyConfig.pointValueCOP,
        reasonKey: 'adjustment',
        reason: `${REASON_META.adjustment.label}: ${reasonNote}`,
        status: 'available',
        createdAt
      });
    }

    if (xp !== 0) {
      xpLedgers.push({
        id: 'xp_adj_' + Date.now(),
        userEmail,
        xp,
        reasonKey: 'adjustment',
        reason: `${REASON_META.adjustment.label}: ${reasonNote}`,
        status: 'available',
        createdAt
      });
    }
  },

  // Helper para Suite de Pruebas: Exponer los ledgers crudos para auditoría
  _rawPointsLedger() {
    return pointsLedgers;
  },

  _rawXpLedger() {
    return xpLedgers;
  }
};

module.exports = LoyaltyBalanceService;
