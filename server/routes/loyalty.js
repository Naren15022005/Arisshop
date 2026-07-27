// Server Route: Loyalty System (Puntos + XP) v3 — ArisShop
// Todos los endpoints leen y calculan balances desde la Fuente Única de Verdad: LoyaltyBalanceService

const express = require('express');
const { verifyToken } = require('./auth');
const LoyaltyBalanceService = require('../services/LoyaltyBalanceService');

const router = express.Router();

// GET /api/loyalty/summary — Obtener resumen completo reconciliado directamente del Servicio Único
router.get('/summary', verifyToken, (req, res) => {
  try {
    const userEmail = req.user.email;
    const summary = LoyaltyBalanceService.calculateUserSummary(userEmail);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Error calculando el resumen de fidelidad.' });
  }
});

// GET /api/loyalty/user-coupons — Cupones personales canjeados del usuario
router.get('/user-coupons', verifyToken, (req, res) => {
  try {
    const userEmail = req.user.email;
    const summary = LoyaltyBalanceService.calculateUserSummary(userEmail);
    res.json({ coupons: summary.userCoupons });
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo los cupones del usuario.' });
  }
});

// GET /api/loyalty/rewards — Catálogo de Recompensas
router.get('/rewards', (req, res) => {
  res.json({
    rewards: LoyaltyBalanceService.getRewardCatalog(),
    config: LoyaltyBalanceService.getLoyaltyConfig()
  });
});

// POST /api/loyalty/redeem — Flujo Completo de Canje con Emisión de Cupón de 90 días
router.post('/redeem', verifyToken, (req, res) => {
  try {
    const userEmail = req.user.email;
    const { rewardId } = req.body;

    const result = LoyaltyBalanceService.redeemReward(userEmail, rewardId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error al procesar el canje de la recompensa.' });
  }
});

// Helper de acreditación en pedidos exportado para server.js
function processOrderLoyaltyRewards({ userEmail, orderId, totalCOP }) {
  return LoyaltyBalanceService.processOrderAccreditation({ userEmail, orderId, totalCOP });
}

module.exports = { router, processOrderLoyaltyRewards };
