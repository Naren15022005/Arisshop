const express = require('express');
const router = express.Router();
const FirebaseService = require('../firebase-admin');

// Memoria inicial de ventas conectada a BD (comienza vacía en 0)
global.localSalesMemory = global.localSalesMemory || [];

// GET /api/sales - Obtener registro de ventas con comprobantes y facturas desde BD
router.get('/', async (req, res) => {
  try {
    let sales = global.localSalesMemory;

    // Si Firestore tiene órdenes, enriquecer las ventas con órdenes reales
    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
      const orders = snapshot.docs.map(doc => doc.data());
      
      orders.forEach(o => {
        const exists = sales.some(s => s.orderId === o.orderId);
        if (!exists && o.total) {
          const total = o.total || 0;
          const subtotal = Math.round(total / 1.19);
          const tax = total - subtotal;
          sales.unshift({
            id: `FAC-2026-${String(sales.length + 1).padStart(3, '0')}`,
            invoiceNumber: `FAC-2026-${String(sales.length + 1).padStart(3, '0')}`,
            orderId: o.orderId || 'ORD-GEN',
            clientName: o.name || 'Cliente ArisShop',
            clientEmail: o.email || 'cliente@arisshop.co',
            clientNit: o.nit || '222222222-2',
            paymentMethod: o.paymentMethod || 'Transferencia',
            receiptCode: `COMP-ONLINE-${Math.floor(100000 + Math.random() * 900000)}`,
            receiptStatus: 'VERIFICADO',
            status: 'PAGADA',
            subtotal,
            tax,
            total,
            createdAt: o.createdAt || new Date().toISOString(),
            items: o.items || [{ name: 'Producto ArisShop', qty: 1, unitPrice: total }]
          });
        }
      });
    }

    res.json({ count: sales.length, sales });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando historial de ventas', details: err.message });
  }
});

// GET /api/sales/:id - Obtener detalle de factura y comprobante
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sale = global.localSalesMemory.find(s => s.id === id || s.invoiceNumber === id || s.orderId === id);
  if (!sale) {
    return res.status(404).json({ error: 'Factura / Venta no encontrada.' });
  }
  res.json({ sale });
});

// POST /api/sales - Registrar nueva venta o subir comprobante
router.post('/', (req, res) => {
  const { orderId, clientName, clientEmail, clientNit, paymentMethod, receiptCode, items, total } = req.body;
  if (!clientEmail || !total) {
    return res.status(400).json({ error: 'Email de cliente y total son requeridos.' });
  }

  const subtotal = Math.round(total / 1.19);
  const tax = total - subtotal;
  const newSale = {
    id: `FAC-2026-${String(global.localSalesMemory.length + 1).padStart(3, '0')}`,
    invoiceNumber: `FAC-2026-${String(global.localSalesMemory.length + 1).padStart(3, '0')}`,
    orderId: orderId || `ORD-${Date.now()}`,
    clientName: clientName || 'Cliente ArisShop',
    clientEmail,
    clientNit: clientNit || '222222222-2',
    paymentMethod: paymentMethod || 'Nequi / Transferencia',
    receiptCode: receiptCode || `COMP-${Math.floor(100000 + Math.random() * 900000)}`,
    receiptStatus: 'VERIFICADO',
    status: 'PAGADA',
    subtotal,
    tax,
    total,
    createdAt: new Date().toISOString(),
    items: items || [{ name: 'Compra ArisShop', qty: 1, unitPrice: total }]
  };

  global.localSalesMemory.unshift(newSale);
  res.status(201).json({ message: 'Venta y factura registradas exitosamente', sale: newSale });
});

module.exports = router;
