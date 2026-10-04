// Centralized product data for the app
// Agrega un campo `img: 'ruta/a/imagen.jpg'` a cada producto para habilitar fotos reales en el catálogo.
// Usa solo `img` para la ruta real de la foto del producto. No incluyas el campo `emoji` en los objetos de producto.
// Define aquí las categorías manuales que usarás en el home y en los filtros.
// El valor `label` debe ser el mismo que usas en el campo `cat` de cada producto.
const CATEGORIES = [
  { slug:'cuentas-ia', label:'Cuentas IA', image:'src/img/product-placeholder.svg' },
  { slug:'juegos-digitales', label:'Juegos Digitales', image:'src/img/product-placeholder.svg' },
  { slug:'software-suscripciones', label:'Software y Suscripciones', image:'src/img/product-placeholder.svg' }
];

// Si agregas aquí una nueva categoría manual, solo debe coincidir el label con el campo `cat` de los productos.
// Ejemplo:
// { slug:'smart-home', label:'Smart Home', image:'src/img/cat-smart-home.jpg' }

const ALL = [
  {id:1,  name:'ChatGPT Plus (1 Mes)',  cat:'Cuentas IA', price:90000, old:100000, img:'src/img/card-chatgpt.jpg', badge:'hot', specs:'GPT-4o · DALL-E 3 · Acceso Prioritario', desc:'Potencia tu productividad con el modelo más avanzado de OpenAI.'},
  {id:2,  name:'Midjourney Pro (1 Mes)',cat:'Cuentas IA', price:240000, old:null,    img:'src/img/card-midjourney.jpg', badge:'new',  specs:'Fast GPU · Stealth Mode · Max Upscale', desc:'Crea imágenes increíbles sin límites de velocidad ni resolución.'},
  {id:3,  name:'Claude Pro (1 Mes)',    cat:'Cuentas IA', price:90000, old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'Opus Model · 5x Usage · Early Access', desc:'El asistente de IA con mayor ventana de contexto del mercado.'},
  {id:4,  name:'Xbox Game Pass Ultimate',cat:'Juegos Digitales', price:45000, old:55000, img:'src/img/card-gamepass.jpg', badge:'sale', specs:'1 Mes · Consola y PC · Cloud Gaming', desc:'Acceso a cientos de juegos de alta calidad y lanzamientos día uno.'},
  {id:5,  name:'Elden Ring (Steam Key)', cat:'Juegos Digitales', price:180000, old:220000,img:'src/img/product-placeholder.svg', badge:'hot',  specs:'PC · RPG · Mundo Abierto', desc:'El juego del año de FromSoftware. Clave global para Steam.'},
  {id:6,  name:'Minecraft Java & Bedrock',cat:'Juegos Digitales', price:95000, old:null,    img:'src/img/product-placeholder.svg', badge:null,   specs:'PC/Mac · Acceso Completo · Multiplayer', desc:'Construye, sobrevive y explora en el juego más vendido del mundo.'},
  {id:7,  name:'Cyberpunk 2077 (GOG)',   cat:'Juegos Digitales', price:120000, old:150000,img:'src/img/product-placeholder.svg', badge:'sale', specs:'PC · RPG · Phantom Liberty Ready', desc:'Explora Night City en esta experiencia RPG de próxima generación.'},
  {id:8,  name:'Adobe Creative Cloud',   cat:'Software y Suscripciones', price:220000, old:null, img:'src/img/product-placeholder.svg', badge:'hot', specs:'1 Mes · +20 Apps · 100GB Cloud', desc:'Photoshop, Illustrator, Premiere y más para profesionales creativos.'},
  {id:9,  name:'Microsoft 365 Personal', cat:'Software y Suscripciones', price:180000, old:210000,img:'src/img/product-placeholder.svg', badge:'sale', specs:'1 Año · 1TB OneDrive · Word/Excel', desc:'La suite de productividad estándar de la industria.'},
  {id:10, name:'Spotify Premium (3 Meses)',cat:'Software y Suscripciones', price:45000, old:50000, img:'src/img/product-placeholder.svg', badge:'new', specs:'Música sin anuncios · Descargas · HQ Audio', desc:'Escucha tu música favorita sin interrupciones.'},
  {id:11, name:'Netflix Premium (1 Mes)', cat:'Software y Suscripciones', price:38000, old:null, img:'src/img/product-placeholder.svg', badge:'hot', specs:'4K+HDR · 4 Pantallas · Descargas', desc:'Series y películas ilimitadas en máxima calidad.'},
  {id:12, name:'NordVPN (1 Año)',        cat:'Software y Suscripciones', price:185000, old:250000,img:'src/img/product-placeholder.svg', badge:'sale', specs:'6 Dispositivos · Malware Protection', desc:'Navega de forma segura y privada con la VPN más rápida.'}
];

// Expose to global scope for existing non-module scripts
window.CATEGORIES = CATEGORIES;
window.ALL = ALL;
