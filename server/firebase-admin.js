// Firebase Admin SDK Service for Node.js Backend
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;
let auth = null;
let isFirebaseConnected = false;

// Intentar inicializar con archivo local serviceAccountKey.json o variable de entorno
try {
  const serviceKeyPath = path.join(__dirname, 'serviceAccountKey.json');
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseConnected = true;
  } else if (fs.existsSync(serviceKeyPath)) {
    const serviceAccount = require(serviceKeyPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseConnected = true;
  }

  if (isFirebaseConnected) {
    db = admin.firestore();
    auth = admin.auth();
    console.log('🔥 Firebase Admin SDK conectado exitosamente a Firestore Database.');
  } else {
    console.log('ℹ️ Firebase Admin SDK iniciado en modo local (Para conectar tu Firestore real, coloca serviceAccountKey.json en la carpeta /server).');
  }
} catch (error) {
  console.warn('⚠️ No se pudo inicializar Firebase Admin SDK con la clave actual. Se utilizará persistencia en memoria local:', error.message);
}

// Memoria local de respaldo
const localOrders = [];
const localProductsStock = {};

// Servicio de Operaciones con Firestore / Backup
const FirebaseService = {
  isReady() {
    return isFirebaseConnected;
  },

  // Guardar orden en la colección 'orders' de Firestore
  async saveOrder(orderData) {
    const orderDoc = {
      orderId: orderData.orderId || `ORD-${Date.now().toString().slice(-6)}`,
      name: orderData.name,
      email: orderData.email,
      phone: orderData.phone,
      address: orderData.address,
      paymentMethod: orderData.paymentMethod,
      total: orderData.total,
      items: orderData.items || [],
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };

    if (isFirebaseConnected && db) {
      try {
        const docRef = await db.collection('orders').add(orderDoc);
        console.log(`💾 Orden registrada en Firestore con ID de documento: ${docRef.id}`);
        return { ...orderDoc, firestoreId: docRef.id };
      } catch (err) {
        console.error('Error guardando orden en Firestore:', err);
      }
    }

    // Backup local
    localOrders.push(orderDoc);
    return orderDoc;
  },

  // Actualizar stock de un producto en la colección 'products' de Firestore
  async updateStock(productId, newStock) {
    localProductsStock[productId] = newStock;

    if (isFirebaseConnected && db) {
      try {
        const productRef = db.collection('products').doc(String(productId));
        await productRef.set({ stock: newStock, updatedAt: new Date().toISOString() }, { merge: true });
        console.log(`📦 Stock actualizado en Firestore para producto #${productId}: ${newStock}`);
      } catch (err) {
        console.error('Error actualizando stock en Firestore:', err);
      }
    }
    return { productId, newStock };
  },

  // Verificar Token de Usuario de Firebase Auth
  async verifyFirebaseToken(idToken) {
    if (isFirebaseConnected && auth) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
      } catch (err) {
        throw new Error('Token de Firebase inválido');
      }
    }
    return null;
  }
};

module.exports = FirebaseService;
