# Flujo y arquitectura de archivos — ArisShop

## Estado actual
- Status: prototipo de e-commerce estático funcional con catálogo, detalle de producto, carrito global, checkout simulado y facturación PDF.
- Alcance: todas las páginas usan el mismo catálogo centralizado y el carrito persiste en `localStorage`.
- Avance general estimado: 80%.

## Arquitectura del proyecto
- `home.html` — landing page con sección de categorías y productos destacados.
- `src/pages/catalogo.html` — catálogo de productos con filtros, búsqueda, paginación, vista de lista/grilla y botones de acción.
- `src/pages/detalle.html` — detalle del producto cargado por query string `?id=`.
- `src/css/home.css`, `src/css/catalogo.css`, `src/css/detalle.css` — estilos específicos por página y componentes compartidos.
- `src/js/utils.js` — utilidades compartidas: `fmt()` para moneda y `debounce()` para búsquedas.
- `src/js/data.js` — catálogo centralizado `window.ALL` con productos, metadatos y placeholders de imagen.
- `src/js/cart.js` — gestor global del carrito: persistencia, render de carrito, checkout modal, PDF y QR.
- `src/js/catalogo.js` — renderizado de productos, filtros, paginación y navegación hacia detalle.
- `src/js/detalle.js` — renderizado de detalle, imagen de producto, productos relacionados y cantidad.
- `src/js/home.js` — renderiza productos destacados desde `window.ALL` y llama a `addToCart(id)`.

## Flujo de datos y navegación
1. La aplicación carga `src/js/utils.js`, `src/js/data.js`, `src/js/cart.js` y luego el script específico de cada página.
2. `src/js/data.js` expone `window.ALL`, el catálogo compartido.
3. `home.js` y `catalogo.js` consumen el catálogo para renderizar tarjetas de producto.
4. Los enlaces de `catalogo.html` apuntan a `/src/pages/detalle.html?id=${id}`.
5. `detalle.js` extrae `id`, busca el producto en `window.ALL` y completa la vista.
6. `cart.js` gestiona el carrito centralizado, la persistencia y los eventos globales.

## Implementaciones clave
### Catálogo y detalle
- `catalogo.js` filtra por categoría, búsqueda y precio.
- El catálogo renderiza en dos modos: grilla y lista.
- `detalle.js` mantiene el flujo de detalles con una sola fuente de verdad (`window.ALL`).
- Los productos relacionados se basan en la misma categoría del producto actual.

### Imagenes y placeholders
- Se agregó soporte para imágenes opcionales usando el campo `img` en `src/js/data.js`.
- Si un producto no tiene `img`, el UI muestra un placeholder neutro de texto `Imagen` en lugar de emoji.
- `detalle.html` ya no muestra un emoji fijo; usa un contenedor de imagen listo para `background-image`.
- Los thumbnails del carrito y las tarjetas de producto aceptan `background-image: url(...)`.

### Carrito y checkout
- `cart.js` guarda `cart` en `localStorage` con clave `aris_cart_v1`.
- Funciones globales expuestas: `addToCart`, `changeQty`, `updateCartUI`, `openCart`, `closeCart`, `toggleCart`.
- Checkout abre un modal con formulario: nombre, email, teléfono, dirección y selección de medio de pago.
- Al enviar el checkout se genera una factura PDF con `jsPDF` y QR con `QRious`.
- Tras generar la factura, se limpia el carrito y se abre WhatsApp con el resumen del pedido.

## Estado de avance por área
- Catálogo y filtros: 90% (funciona, necesita mejoras de UI/responsividad fina).
- Detalle de producto: 90% (carga correcta por ID, soporte de relacionados y placeholders).
- Carrito global: 85% (persistencia + UI listada, checkout funcional).
- Facturación PDF/QR: 80% (genera PDF y QR, pero el diseño podría refinarse y la integración de datos de imagen es limitada).
- Imagenes del catálogo: 70% (soporte de placeholders implementado; requiere `img` en `data.js` para fotos reales).
- Rutas y navegación: 95% (rutas absolutas corregidas y navegación establecida).

## Qué falta por realizar
- Añadir datos `img` reales en `src/js/data.js` para cada producto.
- Mejorar el diseño visual de la factura PDF y/o permitir vista previa directa.
- Añadir validación más robusta del formulario de checkout (regex, formato de teléfono, email).
- Consolidar código repetido de renderizado en funciones reutilizables.
- Agregar un sistema de componentes o plantillas para evitar strings HTML inline.
- Implementar autenticación o fuente de backend si se necesita operación real.
- Revisar accesibilidad de formularios, modales y flujos de teclado.

## Mejora de rendimiento y usabilidad
- Rendimiento
  - Evitar insertar HTML con strings directos y pasar a creación DOM programática o template literals más controlados.
  - Usar `requestAnimationFrame` para animaciones ya implementadas en catálogo.
  - Reducir cálculos repetidos en filtros y paginación.
  - Cargar imágenes optimizadas / placeholders antes de fondos reales.
- Usabilidad
  - Mejorar estados vacíos e indicadores de carga en páginas de catálogo y detalle.
  - Hacer el checkout más claro con mensajes de estado y confirmación visual.
  - Añadir tooltips o texto de ayuda para métodos de pago.
  - Hacer responsivo el carrito/modal en móviles.

## Seguridad y limpieza de código
- Seguridad actual
  - La aplicación es completamente cliente-side; no hay backend ni sanitización del servidor.
  - Exponer funciones globales como `addToCart`/`changeQty` es práctico para inline handlers, pero aumenta la superficie de manipulación accidental.
  - El checkout usa `window.open` a WhatsApp con texto codificado, lo cual es funcional pero no es una transacción segura.
  - No hay protección contra inyección de datos maliciosos en `window.ALL`, aunque el contenido actual es estático.
- Clean code
  - El código mantiene separación lógica: datos, carrito, catálogo, detalle y utilidades.
  - Hay HTML inyectado con plantillas en JS; esto es aceptable para prototipos, pero debería refactorizarse para mayor mantenimiento.
  - Se recomienda limpiar duplicados de estilos y mover estilos compartidos a un archivo CSS común.
  - La nomenclatura es consistente en la mayoría de los casos, pero pueden pulirse funciones globales y eliminar comentarios obsoletos.

## Recomendaciones para avanzar
1. Agregar `img: 'ruta/imagen.jpg'` a cada producto en `src/js/data.js`.
2. Extraer renderizado de tarjetas a funciones comunes o plantillas reutilizables.
3. Usar un servidor local (`Live Server` / `npx serve`) para probar rutas absolutas y evitar dependencias de rutas según carpeta.
4. Añadir validación de formulario en `cart.js` y mostrar errores inline.
5. Refactorizar el modal de checkout para un componente más accesible.
6. Considerar separar los estilos compartidos y los componentes CSS reutilizables.

---
Generado el: 13/07/2026 00:00:00