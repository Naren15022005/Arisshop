const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { router: authRouter } = require('./routes/auth');
const { router: loyaltyRouter, processOrderLoyaltyRewards } = require('./routes/loyalty');
const ordersRouter = require('./routes/orders');
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const FirebaseService = require('./firebase-admin');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.set('io', io);
global.localOrdersMemory = [];

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// REST Routes
app.use('/api/auth', authRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Servidor ArisShop corriendo correctamente con JWT, WebSockets y Firebase Admin',
    firebaseConnected: FirebaseService.isReady()
  });
});

// Endpoint REST para recibir pedidos y guardarlos en Firestore
app.post('/api/orders', async (req, res) => {
  try {
    const savedOrder = await FirebaseService.saveOrder(req.body);
    if (savedOrder.email && savedOrder.total) {
      processOrderLoyaltyRewards({ userEmail: savedOrder.email, orderId: savedOrder.orderId, totalCOP: savedOrder.total });
    }
    // Notificar por WebSocket
    io.emit('order:new', {
      orderId: savedOrder.orderId,
      name: savedOrder.name,
      total: savedOrder.total,
      time: new Date().toLocaleTimeString('es-CO')
    });
    res.status(201).json({ message: 'Pedido guardado en Firestore exitosamente', order: savedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando pedido' });
  }
});

// Real-Time WebSockets (Socket.io)
let activeConnections = 0;

io.on('connection', (socket) => {
  activeConnections++;
  console.log(`⚡ Cliente conectado a WebSockets (ID: ${socket.id}). Conexiones activas: ${activeConnections}`);

  // Emitir número de usuarios activos
  io.emit('users:active', activeConnections);

  // Escuchar cuando un cliente realiza un pedido
  socket.on('order:place', async (orderData) => {
    console.log(`🛒 Nuevo pedido recibido vía WebSocket: Orden #${orderData.orderId || Date.now()}`);
    
    // Persistir orden en Firestore Database
    const savedOrder = await FirebaseService.saveOrder(orderData);

    // Emitir a todos los clientes para alertas en vivo
    socket.broadcast.emit('order:new', {
      orderId: savedOrder.orderId,
      name: savedOrder.name,
      total: savedOrder.total,
      itemCount: savedOrder.items ? savedOrder.items.length : 1,
      time: new Date().toLocaleTimeString('es-CO')
    });
  });

  // Escuchar actualización de stock en tiempo real
  socket.on('stock:update', async (stockData) => {
    console.log(`📦 Actualización de stock recibida: Producto ID ${stockData.productId} -> Stock: ${stockData.newStock}`);
    await FirebaseService.updateStock(stockData.productId, stockData.newStock);
    io.emit('stock:update', stockData);
  });

  socket.on('disconnect', () => {
    activeConnections = Math.max(0, activeConnections - 1);
    console.log(`🔌 Cliente desconectado. Conexiones activas: ${activeConnections}`);
    io.emit('users:active', activeConnections);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor ArisShop Full-Stack corriendo en http://localhost:${PORT}`);
  console.log(`🔒 JWT Autenticación en http://localhost:${PORT}/api/auth`);
  console.log(`⚡ WebSockets en ws://localhost:${PORT}`);
});
