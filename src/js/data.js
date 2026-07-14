// Centralized product data for the app
// Agrega un campo `img: 'ruta/a/imagen.jpg'` a cada producto para habilitar fotos reales en el catálogo.
// Usa solo `img` para la ruta real de la foto del producto. No incluyas el campo `emoji` en los objetos de producto.
// Define aquí las categorías manuales que usarás en el home y en los filtros.
// El valor `label` debe ser el mismo que usas en el campo `cat` de cada producto.
const CATEGORIES = [
  { slug:'accesorios-celulares', label:'Accesorios celulares', image:'src/img/cat-accesorios-celulares.jpg' },
  { slug:'accesorios-streaming', label:'Accesorios streaming', image:'src/img/cat-accesorios-streaming.jpg' },
  { slug:'audios-parlantes', label:'Audios y parlantes', image:'src/img/cat-audio.jpg' },
  { slug:'videojuegos-ninos', label:'Videojuegos y niños', image:'src/img/cat-gaming.jpg' },
];

// Si agregas aquí una nueva categoría manual, solo debe coincidir el label con el campo `cat` de los productos.
// Ejemplo:
// { slug:'smart-home', label:'Smart Home', image:'src/img/cat-smart-home.jpg' }

const ALL = [
  {id:1,  name:'iPhone 15 Pro Max 256GB',  cat:'Smartphones', price:5890000, old:6200000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'256GB · Titanio · iOS 17', desc:'El último iPhone con chip A17 Pro, cámara de 48MP y batería para todo del día.'},
  {id:2,  name:'iPhone 14 128GB',          cat:'Smartphones', price:3490000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'128GB · Negro · iOS 16', desc:'Potente y ligero, con cámara dual y modo cine.'},
  {id:3,  name:'Samsung Galaxy S24 Ultra', cat:'Smartphones', price:5290000, old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'512GB · Phantom Black', desc:'Pantalla AMOLED 6.8", S Pen integrado y cámara de 200MP.'},
  {id:4,  name:'Samsung Galaxy A55',       cat:'Smartphones', price:1890000, old:2100000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'256GB · Awesome Iceblue', desc:'Equilibrio perfecto entre rendimiento y precio.'},
  {id:5,  name:'MacBook Air M3 13"',       cat:'Laptops',     price:6490000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'8GB RAM · 256GB SSD', desc:'Ultraligera, con el nuevo chip M3 y hasta 18h de batería.'},
  {id:6,  name:'MacBook Pro M4 14"',       cat:'Laptops',     price:9200000, old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'16GB RAM · 512GB SSD', desc:'Para profesionales, con rendimiento extremo y pantalla XDR.'},
  {id:7,  name:'Dell XPS 15 OLED',         cat:'Laptops',     price:7800000, old:8500000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'16GB · RTX 4060 · 1TB', desc:'Potencia y pantalla OLED táctil 4K.'},
  {id:8,  name:'Lenovo ThinkPad X1',       cat:'Laptops',     price:5600000, old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'16GB · Intel i7 · 512GB', desc:'Robustez y teclado excepcional para negocios.'},
  {id:9,  name:'AirPods Pro 2da Gen',      cat:'Audio',       price:889000,  old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'ANC · USB-C · 30h', desc:'Cancelación de ruido activa y audio espacial personalizado.'},
  {id:10, name:'Sony WH-1000XM5',          cat:'Audio',       price:1090000, old:1250000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'ANC · 40h · Hi-Res', desc:'La referencia en cancelación de ruido y calidad de sonido.'},
  {id:11, name:'ArisSound Pro X',          cat:'Audio',       price:389000,  old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'Over-ear · ANC · 40h', desc:'Sonido envolvente y diseño ergonómico.'},
  {id:12, name:'JBL Flip 7',               cat:'Audio',       price:480000,  old:560000,  img:'src/img/product-placeholder.svg', badge:'sale', specs:'Bluetooth 5.4 · IP67', desc:'Portátil, resistente al agua y con sonido potente.'},
  {id:13, name:'Apple Watch Series 9',     cat:'Wearables',   price:1290000, old:1490000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'GPS · Retina · S9 chip', desc:'El smartwatch más avanzado con sensor de temperatura.'},
  {id:14, name:'Samsung Galaxy Watch 6',   cat:'Wearables',   price:890000,  old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'44mm · AMOLED · BioActive', desc:'Monitorización de salud y deporte con precisión.'},
  {id:15, name:'Garmin Forerunner 265',    cat:'Wearables',   price:1450000, old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'AMOLED · GPS · Running', desc:'Ideal para corredores con métricas avanzadas.'},
  {id:16, name:'Fitbit Charge 6',          cat:'Wearables',   price:480000,  old:520000,  img:'src/img/product-placeholder.svg', badge:'sale', specs:'7 días batería · SpO2', desc:'Seguimiento de actividad y sueño.'},
  {id:17, name:'iPad Pro M4 11"',          cat:'Tablets',     price:4200000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'OLED · WiFi · 256GB', desc:'El rendimiento de un ordenador en formato tableta.'},
  {id:18, name:'Samsung Tab S9',           cat:'Tablets',     price:2800000, old:3100000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'12.4" AMOLED · 256GB', desc:'Ideal para creativos con S Pen incluido.'},
  {id:19, name:'Lenovo Tab P12 Pro',       cat:'Tablets',     price:1950000, old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'12.6" AMOLED · 8GB RAM', desc:'Multimedia y productividad en una pantalla enorme.'},
  {id:20, name:'Logitech MX Master 3S',   cat:'Accesorios',  price:380000,  old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'8000 DPI · Silencioso', desc:'El mejor ratón para productividad con scroll magnético.'},
  {id:21, name:'Teclado Keychron K2 V2',  cat:'Accesorios',  price:420000,  old:480000,  img:'src/img/product-placeholder.svg', badge:'sale', specs:'TKL · Hot-swap · RGB', desc:'Teclado mecánico inalámbrico con switches intercambiables.'},
  {id:22, name:'Monitor LG 27" 4K',       cat:'Accesorios',  price:1890000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'IPS · 144Hz · HDR10', desc:'Nitidez y color para diseño y juegos.'},
  {id:23, name:'Webcam Logitech C920 HD', cat:'Accesorios',  price:290000,  old:340000,  img:'src/img/product-placeholder.svg', badge:'sale', specs:'1080p · 30fps · Mic', desc:'Videollamadas nítidas con micrófono estéreo.'},
  {id:24, name:'Hub USB-C 7en1',          cat:'Accesorios',  price:120000,  old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'HDMI 4K · SD · PD 100W', desc:'Conectividad completa para tu laptop.'},
  {id:25, name:'Nintendo Switch OLED',    cat:'Gaming',      price:1850000, old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'7" OLED · 64GB', desc:'La consola híbrida con pantalla OLED vibrante.'},
  {id:26, name:'PS5 Slim Digital',        cat:'Gaming',      price:2900000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'825GB SSD · 4K · 120fps', desc:'La nueva PS5 más compacta y sin lector.'},
  {id:27, name:'Xbox Series S',           cat:'Gaming',      price:1650000, old:1900000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'512GB · 1440p · Game Pass', desc:'Acceso a cientos de juegos con Game Pass.'},
  {id:28, name:'Control PS5 DualSense',   cat:'Gaming',      price:380000,  old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'Haptic · Adaptive triggers', desc:'Control inalámbrico con retroalimentación háptica.'},
  {id:29, name:'GoPro Hero 13 Black',     cat:'Cámaras',     price:1990000, old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'5.3K · Waterproof · HyperSmooth', desc:'Cámara de acción con estabilización mejorada.'},
  {id:30, name:'DJI Mini 4 Pro',          cat:'Cámaras',     price:3800000, old:null,    img:'src/img/product-placeholder.svg', badge:'hot',  specs:'4K/100fps · 34min vuelo', desc:'Dron plegable con cámara de alta calidad.'},
  {id:31, name:'Sony ZV-1F',              cat:'Cámaras',     price:1350000, old:1500000, img:'src/img/product-placeholder.svg', badge:'sale', specs:'20mm · 4K · Vlog', desc:'Cámara compacta para vlogging con enfoque automático.'},
  {id:32, name:'Ring Doorbell 4',         cat:'Smart Home',  price:650000,  old:null,    img:'src/img/product-placeholder.svg', badge:'new',  specs:'1080p · WiFi · 2 vías', desc:'Videoportero inteligente con detección de movimiento.'},
];

// Expose to global scope for existing non-module scripts
window.CATEGORIES = CATEGORIES;
window.ALL = ALL;
