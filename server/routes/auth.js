const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'arisshop_secret_jwt_key_2026';

// Memoria temporal de usuarios (reemplazable por DB como MongoDB/PostgreSQL)
const users = [];

// Pre-cargar cuentas administrativas
bcrypt.hash('admin123', 10).then(hashed => {
  users.push({
    id: 'usr_admin_default',
    name: 'Administrador ArisShop',
    email: 'admin@arisshop.co',
    password: hashed,
    role: 'admin'
  });
  users.push({
    id: 'usr_admin_alfonso',
    name: 'Alfonso Navarro',
    email: 'alfonsonavarroch@gmail.com',
    password: hashed,
    role: 'admin'
  });
});

// Middleware de verificación de JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Formato de token inválido.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
    }

    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ error: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'usr_' + Date.now(),
      name: name || email.split('@')[0],
      email,
      password: hashedPassword,
      role: (role === 'admin' || email.includes('admin')) ? 'admin' : 'customer'
    };

    users.push(newUser);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en inicio de sesión.' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, verifyToken };
