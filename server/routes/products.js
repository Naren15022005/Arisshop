const express = require('express');
const router = express.Router();
const FirebaseService = require('../firebase-admin');

// Memoria local de respaldo para productos con estructura completa de ArisShop
global.localProductsMemory = global.localProductsMemory || [
  {
    id: 'PROD-101',
    name: 'Teclado Mecánico RGB Pro',
    category: 'Gaming Setup',
    price: 250000,
    originalPrice: 290000,
    stock: 15,
    status: 'Activo',
    badge: 'Más Vendido',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60',
    additionalImages: [
      'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&auto=format&fit=crop&q=60'
    ],
    description: 'Teclado mecánico con switches red, retroiluminación RGB personalizada y chasis de aluminio.',
    features: 'Conexión USB-C, Anti-Ghosting N-Key, Switches Red de alta durabilidad',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PROD-102',
    name: 'Audífonos Bluetooth Noise Cancelling',
    category: 'Audio Pro',
    price: 180000,
    originalPrice: 220000,
    stock: 20,
    status: 'Activo',
    badge: 'Oferta',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
    additionalImages: [
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&auto=format&fit=crop&q=60'
    ],
    description: 'Audífonos inalámbricos de alta fidelidad con cancelación activa de ruido ANC y 30 horas de autonomía.',
    features: 'Bluetooth 5.2, Micrófono HD integrado, Carga rápida USB-C',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PROD-103',
    name: 'Monitor Gamer 27" 165Hz IPS',
    category: 'Gaming Setup',
    price: 800000,
    originalPrice: 950000,
    stock: 8,
    status: 'Activo',
    badge: 'Premium',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60',
    additionalImages: [],
    description: 'Pantalla IPS QHD 2K de 165Hz 1ms con tecnología FreeSync Premium y HDR400.',
    features: 'Panel IPS 27", DisplayPort 1.4 + 2x HDMI 2.0, Soporte VESA',
    createdAt: new Date().toISOString()
  }
];

// GET /api/products - Consultar catálogo completo desde Firestore Database / Memoria
router.get('/', async (req, res) => {
  try {
    let products = global.localProductsMemory;
    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      const snapshot = await db.collection('products').get();
      if (!snapshot.empty) {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        // Auto-poblar Firestore con el catálogo base de ArisShop si la colección está vacía
        for (const p of global.localProductsMemory) {
          const { id, ...pData } = p;
          await db.collection('products').doc(id).set(pData);
        }
      }
    }
    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ error: 'Error consultando productos en Firestore' });
  }
});

// POST /api/products - Crear nuevo producto en Firestore
router.post('/', async (req, res) => {
  try {
    const { name, category, price, originalPrice, stock, status, badge, image, additionalImages, description, features } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const newProd = {
      name,
      category: category || 'Accesorios Celulares',
      price: Number(price) || 0,
      originalPrice: originalPrice ? Number(originalPrice) : Number(price),
      stock: Number(stock) || 1,
      status: status || 'Activo',
      badge: badge || 'Nuevo',
      image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60',
      additionalImages: Array.isArray(additionalImages) ? additionalImages : (additionalImages ? [additionalImages] : []),
      description: description || '',
      features: features || '',
      createdAt: new Date().toISOString()
    };

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      const docRef = await db.collection('products').add(newProd);
      newProd.id = docRef.id;
    } else {
      newProd.id = 'PROD-' + Date.now();
    }

    global.localProductsMemory.unshift(newProd);

    const io = req.app.get('io');
    if (io) {
      io.emit('product:new', newProd);
    }

    res.status(201).json({ message: 'Producto registrado exitosamente en Firebase', product: newProd });
  } catch (err) {
    res.status(500).json({ error: 'Error registrando nuevo producto en Firebase' });
  }
});

// PUT /api/products/:id - Actualizar producto en Firestore
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, originalPrice, stock, status, badge, image, additionalImages, description, features } = req.body;

    let updated = null;
    const idx = global.localProductsMemory.findIndex(p => p.id === id);
    if (idx !== -1) {
      global.localProductsMemory[idx] = {
        ...global.localProductsMemory[idx],
        ...(name && { name }),
        ...(category && { category }),
        ...(price !== undefined && { price: Number(price) }),
        ...(originalPrice !== undefined && { originalPrice: Number(originalPrice) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(status && { status }),
        ...(badge !== undefined && { badge }),
        ...(image && { image }),
        ...(additionalImages !== undefined && { additionalImages: Array.isArray(additionalImages) ? additionalImages : [additionalImages] }),
        ...(description !== undefined && { description }),
        ...(features !== undefined && { features }),
        updatedAt: new Date().toISOString()
      };
      updated = global.localProductsMemory[idx];
    }

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection('products').doc(id).set({
        name, category, price: Number(price), originalPrice: Number(originalPrice),
        stock: Number(stock), status, badge, image, additionalImages, description, features,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('product:update', updated || { id, ...req.body });
    }

    res.json({ message: 'Producto actualizado exitosamente en Firebase', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando producto en Firebase' });
  }
});

// PATCH /api/products/:id/toggle-status - Alternar visibilidad (Activo / Oculto)
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    let newStatus = 'Activo';

    const idx = global.localProductsMemory.findIndex(p => p.id === id);
    if (idx !== -1) {
      newStatus = global.localProductsMemory[idx].status === 'Activo' ? 'Oculto' : 'Activo';
      global.localProductsMemory[idx].status = newStatus;
    }

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection('products').doc(id).update({ status: newStatus });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('product:update', { id, status: newStatus });
    }

    res.json({ message: `Estado cambiado a ${newStatus}`, id, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Error cambiando estado del producto' });
  }
});

// DELETE /api/products/:id - Eliminar producto en Firestore
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    global.localProductsMemory = global.localProductsMemory.filter(p => p.id !== id);

    if (FirebaseService.isReady()) {
      const admin = require('firebase-admin');
      const db = admin.firestore();
      await db.collection('products').doc(id).delete();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('product:delete', { id });
    }

    res.json({ message: 'Producto eliminado exitosamente de Firebase', id });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando producto de Firebase' });
  }
});

module.exports = router;
