# Contexto de sesión — ArisShop

## Stack Activo (2026)
- Frontend: Vue 3 (Composition API) + Vite + Pinia + Vue Router (Compilado en `frontend/dist/`).
- Backend: Golang v1.23 + Chi v5 Router + Gorilla WebSockets + Token Bucket Rate Limiting.
- Base de Datos: **Supabase PostgreSQL Cloud (ACID Relational)** vía `pgxpool` en pooler AWS US-West-2 (`eqmsfqsvgcjebkjbgnuv`).
- Ingress: Cloudflare Tunnel HTTPS/WSS hacia backend Go en puerto 3005.

## Última sesión: 04/10/2026

### Migración a Supabase & Desmantelamiento de Firebase
- **Supabase PostgreSQL en Producción**:
  - 6 tablas creadas con integridad referencial (`schema.sql`): `users`, `products`, `orders`, `order_items`, `sales_invoices`, `revoked_tokens`.
  - Transacciones atómicas de stock con `tx.Begin()` para erradicar condiciones de carrera.
  - Administradores verificados y activos con Bcrypt: `alfonsonavarroch@gmail.com` y `admin@arisshop.co`.
- **Limpieza de Firebase**:
  - Eliminación completa de `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` y `FIREBASE_DESPLIEGUE.md`.
  - Purgado de dependencias indirectas de Firebase en `go.mod` y `go.sum` mediante `go mod tidy`.
  - Eliminación de `firebase-admin`, `firebase-functions` y 235 paquetes de `node_modules` en `server/`.
  - Remoción de credenciales locales obsoletas (`serviceAccountKey.json`).
  - Limpieza de dominios Firebase en CORS y comentarios de frontend.

---

*Este archivo se actualiza al final de cada sesión para mantener continuidad.*
