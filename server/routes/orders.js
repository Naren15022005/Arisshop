const express = require('express');
const router = express.Router();
const FirebaseService = require('../firebase-admin');

// GET /api/orders - Obtener todas las órdenes
router.get('/', async (req, res) => {
  try {
    let orders = [];
    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
      orders = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    } else {
      orders = global.localOrdersMemory || [];
    }
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: 'Error consultando órdenes en Firestore', details: err.message });
  }
});

// GET /api/orders/:id - Consultar orden por orderId
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let foundOrder = null;

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      // Buscar por campo orderId o ID de documento
      const snapshot = await db.collection('orders').where('orderId', '==', id).get();
      if (!snapshot.empty) {
        foundOrder = { firestoreId: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      } else {
        const docRef = await db.collection('orders').doc(id).get();
        if (docRef.exists) {
          foundOrder = { firestoreId: docRef.id, ...docRef.data() };
        }
      }
    } else {
      const list = global.localOrdersMemory || [];
      foundOrder = list.find(o => o.orderId === id || o.orderId === `ORD-${id}`);
    }

    if (!foundOrder) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }

    res.json({ order: foundOrder });
  } catch (err) {
    res.status(500).json({ error: 'Error en la consulta de la orden.' });
  }
});

// PUT /api/orders/:id/status - Actualizar estado de orden
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'

    if (!status) {
      return res.status(400).json({ error: 'El estado es requerido.' });
    }

    let updatedOrder = null;

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      
      const snapshot = await db.collection('orders').where('orderId', '==', id).get();
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await docRef.update({ status, updatedAt: new Date().toISOString() });
        const updatedDoc = await docRef.get();
        updatedOrder = { firestoreId: docRef.id, ...updatedDoc.data() };
      }
    } else {
      const list = global.localOrdersMemory || [];
      const order = list.find(o => o.orderId === id);
      if (order) {
        order.status = status;
        order.updatedAt = new Date().toISOString();
        updatedOrder = order;
      }
    }

    // Emitir WebSocket a través de req.app.get('io')
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status', {
        orderId: id,
        status,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Estado de la orden actualizado exitosamente', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando estado de la orden' });
  }
});

module.exports = router;
