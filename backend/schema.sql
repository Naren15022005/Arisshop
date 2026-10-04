-- ====================================================================
-- ESQUEMA RELACIONAL SUPABASE (POSTGRESQL) — ARISSHOP 2026
-- ====================================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(12, 2) DEFAULT 0,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status VARCHAR(30) DEFAULT 'Activo' CHECK (status IN ('Activo', 'Oculto')),
    badge VARCHAR(50) DEFAULT 'Nuevo',
    image TEXT NOT NULL,
    additional_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    description TEXT DEFAULT '',
    features TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    address TEXT NOT NULL,
    payment_method VARCHAR(60) DEFAULT 'Nequi / Bancolombia',
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Renglones de Pedido (Order Items - Integridad Referencial)
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id VARCHAR(64),
    name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    qty INT NOT NULL CHECK (qty > 0)
);

-- 5. Tabla de Facturación y Comprobantes Fiscales
CREATE TABLE IF NOT EXISTS sales_invoices (
    id VARCHAR(64) PRIMARY KEY,
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    order_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(120) NOT NULL,
    client_email VARCHAR(120) NOT NULL,
    client_nit VARCHAR(40) DEFAULT '222222222-2',
    payment_method VARCHAR(60) NOT NULL,
    receipt_code VARCHAR(60) NOT NULL,
    receipt_status VARCHAR(40) DEFAULT 'VERIFICADO',
    status VARCHAR(30) DEFAULT 'PAGADA',
    subtotal NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Revocación de Tokens JWT (Lista Negra Distribuida)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti VARCHAR(64) PRIMARY KEY,
    expires_at BIGINT NOT NULL,
    revoked_at BIGINT NOT NULL
);

-- Índices de Rendimiento y Búsqueda Rápida
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens(expires_at);

-- ====================================================================
-- SEED DATA INICIAL (ADMINS Y CATÁLOGO DE PRODUCTOS)
-- ====================================================================

-- Administradores Garantizados
INSERT INTO users (id, name, email, password, role)
VALUES 
    ('usr_admin_default', 'Administrador ArisShop', 'admin@arisshop.co', '$2a$10$XPxig3Sw62O.eiWVB45Eseug8jztKJ7l5tNGSW3x4Sr.HPy9fCItS', 'admin'),
    ('usr_admin_alfonso', 'Alfonso Navarro', 'alfonsonavarroch@gmail.com', '$2a$10$XPxig3Sw62O.eiWVB45Eseug8jztKJ7l5tNGSW3x4Sr.HPy9fCItS', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Catálogo de Productos
INSERT INTO products (id, name, category, price, original_price, stock, status, badge, image, description, features)
VALUES
    ('hero-airpods', 'AirPods Pro Series 4', 'Audio Pro', 320000, 420000, 12, 'Activo', 'Flagship 2026', '/img/AirpodsProSeries4.webp', 'Cancelación Activa de Ruido 2X y Audio Espacial con seguimiento dinámico de la cabeza.', 'ANC 2X, Autonomía 32H, Estuche MagSafe USB-C'),
    ('tMWYoHXohLLfGosKpWOv', 'Mouse Ergonómico Inalámbrico', 'Gaming Setup', 120000, 150000, 25, 'Activo', 'Nuevo', 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60', 'Mouse ergonómico inalámbrico con sensor óptico de alta precisión.', '16.000 DPI, Conexión Dual 2.4G/BT, Batería 70H'),
    ('PROD-101', 'Teclado Mecánico RGB Pro', 'Gaming Setup', 250000, 290000, 15, 'Activo', 'Más Vendido', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60', 'Teclado mecánico con switches red, retroiluminación RGB personalizada y chasis de aluminio.', 'Switches Red Ópticos, Anti-Ghosting N-Key, Conexión USB-C'),
    ('PROD-102', 'Audífonos Bluetooth Noise Cancelling', 'Audio Pro', 180000, 220000, 20, 'Activo', 'Oferta', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60', 'Audífonos inalámbricos de alta fidelidad con cancelación activa de ruido ANC y 30 horas de autonomía.', 'Bluetooth 5.2, Micrófono HD integrado, Carga rápida USB-C'),
    ('PROD-103', 'Monitor Gamer 27" 165Hz IPS', 'Gaming Setup', 800000, 950000, 8, 'Activo', 'Premium', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&auto=format&fit=crop&q=60', 'Monitor gaming IPS de 27 pulgadas con tasa de refresco ultra fluida de 165Hz y 1ms.', 'Panel IPS 165Hz, 1ms FreeSync/G-Sync, HDMI 2.1 & DisplayPort')
ON CONFLICT (id) DO NOTHING;
