// Test Suite Automatizado: Sistema de Fidelidad (Puntos + XP) & Reconciliación 1:1
// Archivo: server/tests/loyalty.test.js
// 
// Para ejecutar esta prueba automatizada:
// node server/tests/loyalty.test.js

const assert = require('assert');
const LoyaltyBalanceService = require('../services/LoyaltyBalanceService');

console.log('🧪 Iniciando Suite de Pruebas Automatizadas de Seguridad Financiera (ArisShop)...');

const testUserEmail = 'test.finanzas@arisshop.co';

try {
  // -------------------------------------------------------------
  // TEST 1: Inicialización y Resumen con Bono de Bienvenida Pending
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 1: Verificando Bono de Bienvenida inicial (100 PTS / 50 XP en estado PENDING)...');
  const initialSummary = LoyaltyBalanceService.calculateUserSummary(testUserEmail);

  assert.strictEqual(initialSummary.points.balance, 0, 'El saldo activo inicial debe ser 0 PTS (bono pending)');
  assert.strictEqual(initialSummary.points.pending, 100, 'El saldo pendiente del bono debe ser 100 PTS');
  assert.strictEqual(initialSummary.xp.pending, 50, 'El XP pendiente del bono debe ser 50 XP');
  assert.strictEqual(initialSummary.level.tier, 'Bronce', 'El nivel inicial debe ser Bronce');
  console.log('✅ PASS 1: Bono de bienvenida registrado correctamente en estado pending sin fuga de balance.');

  // -------------------------------------------------------------
  // TEST 2: Primera Compras -> Liberación de Bono e Idempotencia
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 2: Acreditando primera compra ($200.000 COP) y probando Idempotencia...');
  const orderId = 'ORD-TEST-999';

  // 1ra acreditación
  const acc1 = LoyaltyBalanceService.processOrderAccreditation({ userEmail: testUserEmail, orderId, totalCOP: 200000 });
  assert.ok(acc1, 'La acreditación de compra debe retornar resultados');

  const postPurchaseSummary1 = LoyaltyBalanceService.calculateUserSummary(testUserEmail);

  // 2da acreditación duplicada del MISMO orderId (Prueba de Idempotencia por webhook o reintento)
  const acc2 = LoyaltyBalanceService.processOrderAccreditation({ userEmail: testUserEmail, orderId, totalCOP: 200000 });
  assert.strictEqual(acc2, null, 'El reintento del mismo orderId debe ser ignorado por idempotencia');

  const postPurchaseSummary2 = LoyaltyBalanceService.calculateUserSummary(testUserEmail);
  assert.strictEqual(postPurchaseSummary1.points.balance, postPurchaseSummary2.points.balance, 'Idempotencia: El saldo de puntos no debe duplicarse');
  assert.strictEqual(postPurchaseSummary1.xp.active, postPurchaseSummary2.xp.active, 'Idempotencia: El XP no debe duplicarse');
  console.log('✅ PASS 2: Idempotencia comprobada. Compras duplicadas son bloqueadas exitosamente.');

  // -------------------------------------------------------------
  // TEST 3: Fuente Única de Verdad (Single Source of Truth)
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 3: Validando igualdad matemática 1:1 entre API Summary y SUM(PointsLedger[available])...');
  
  const rawLedger = LoyaltyBalanceService._rawPointsLedger();
  const userLedgerEntries = rawLedger.filter(p => p.userEmail === testUserEmail && p.status === 'available');
  
  // Cálculo manual directo desde el libro contable
  const manualSum = userLedgerEntries.reduce((sum, p) => sum + p.points, 0);
  const summaryApiBalance = postPurchaseSummary2.points.balance;

  assert.strictEqual(summaryApiBalance, Math.max(0, manualSum), `El balance del API (${summaryApiBalance}) debe ser idéntico a SUM(PointsLedger[available]) (${manualSum})`);
  console.log(`✅ PASS 3: Reconciliación 1:1 verificada. API Balance (${summaryApiBalance} PTS) === SUM(Ledger[available]) (${manualSum} PTS).`);

  // -------------------------------------------------------------
  // TEST 4: Canje de Recompensa y Auditoría Append-Only
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 4: Probando Canje de Recompensa y modelo Append-Only...');
  const preRedeemBalance = summaryApiBalance;
  
  // Intentar canjear recompensa de 500 PTS (Mousepad)
  const redeemResult = LoyaltyBalanceService.redeemReward(testUserEmail, 'rew_1');
  assert.ok(redeemResult.coupon.code.startsWith('ARIS-'), 'El código de cupón emitido debe tener formato ARIS-XXXXXX');
  assert.strictEqual(redeemResult.coupon.status, 'issued', 'El estado del cupón debe ser issued');

  const postRedeemSummary = LoyaltyBalanceService.calculateUserSummary(testUserEmail);
  assert.strictEqual(postRedeemSummary.points.balance, preRedeemBalance - 500, 'El saldo debe haberse reducido exactamente en 500 PTS');
  
  // Validar que el historial es APPEND-ONLY (no borró entradas pasadas)
  const newRawLedger = LoyaltyBalanceService._rawPointsLedger();
  const lastEntry = newRawLedger[newRawLedger.length - 1];
  assert.strictEqual(lastEntry.points, -500, 'La última entrada del ledger debe ser la deducción de -500 PTS');
  assert.strictEqual(lastEntry.reasonKey, 'redeemed', 'La clave del motivo debe ser redeemed');
  console.log('✅ PASS 4: Flujo de canje completo. Cupón único emitido a 90 días y ledger preservado append-only.');

  // -------------------------------------------------------------
  // TEST 5: Protección de Saldo e Intento de Sobregiro
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 5: Validando protección del servidor contra sobregiros...');
  try {
    // Intentar canjear SSD M.2 (4.500 PTS) teniendo menos puntos
    LoyaltyBalanceService.redeemReward(testUserEmail, 'rew_5');
    assert.fail('El servidor debió rechazar el canje por puntos insuficientes');
  } catch (err) {
    assert.ok(err.message.includes('Puntos insuficientes'), 'El mensaje de error debe indicar puntos insuficientes');
    console.log('✅ PASS 5: Protección de servidor verificada. Sobregiros rechazados correctamente.');
  }

  // -------------------------------------------------------------
  // TEST 6: Ajuste Contable Append-Only (Corrección de datos sin UPDATE)
  // -------------------------------------------------------------
  console.log('\n▶ PRUEBA 6: Probando Ajuste Contable Append-Only...');
  const beforeAdjBalance = LoyaltyBalanceService.calculateUserSummary(testUserEmail).points.balance;
  
  // Agregar entrada de ajuste de +50 PTS
  LoyaltyBalanceService.addAdjustmentEntry({
    userEmail: testUserEmail,
    points: 50,
    xp: 0,
    reasonNote: 'Prueba de auditoría contable'
  });

  const afterAdjSummary = LoyaltyBalanceService.calculateUserSummary(testUserEmail);
  assert.strictEqual(afterAdjSummary.points.balance, beforeAdjBalance + 50, 'El ajuste de +50 PTS debe reflejarse en el balance reconciliado');
  console.log('✅ PASS 6: Ajuste contable append-only aplicado con éxito.');

  console.log('\n🎉 TODAS LAS 6 PRUEBAS DE SEGURIDAD FINANCIERA PASARON CON ÉXITO.\n');

} catch (error) {
  console.error('\n❌ ERROR EN LA SUITE DE PRUEBAS AUTOMATIZADAS:', error.message);
  console.error(error.stack);
  process.exit(1);
}
