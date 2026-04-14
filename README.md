# Cartum CMS

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js_v5-black?style=flat-square&logo=authjs)
![Zustand](https://img.shields.io/badge/Zustand-433e38?style=flat-square)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white)

---

**[Español](#español) · [English](#english)**

---

## Español

- [¿Qué es Cartum?](#qué-es-cartum)
- [¿Qué problemas resuelve?](#qué-problemas-resuelve)
- [La analogía del tablero](#la-analogía-del-tablero)
- [Pila tecnológica](#pila-tecnológica)
- [Requisitos](#requisitos)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y arranque local](#instalación-y-arranque-local)
- [Notas de configuración](#notas-de-configuración)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Despliegue en Cloudflare Pages](#despliegue-en-cloudflare-pages)
- [API REST](#api-rest)
- [Scripts disponibles](#scripts-disponibles)
- [Manejo de errores](#manejo-de-errores)

---

### ¿Qué es Cartum?

Cartum es un **CMS headless serverless-first con modelado visual de datos**. Está diseñado para equipos pequeños y desarrolladores que necesitan un backend de contenido flexible, liviano y desplegable en entornos serverless (Vercel, Cloudflare Workers, Netlify), sin la complejidad ni el peso de soluciones como Strapi o Directus.

La interfaz principal es un **tablero de nodos infinito**, donde modelar la base de datos es tan intuitivo como sentarse a una mesa de póker: el tablero es la mesa, los nodos contenedor son los mazos, y cada carta dentro de un mazo es un campo de datos (texto, número, imagen, video, relación...). Defines la estructura visualmente y Cartum genera la API REST automáticamente.

### ¿Qué problemas resuelve?

| Necesidad | Cómo lo resuelve Cartum |
|---|---|
| Modelar datos sin escribir SQL | Tablero visual de nodos con conexiones drag & drop |
| API REST sin código extra | Se genera automáticamente desde el schema visual |
| CMS sin DB propia | Un URL de PostgreSQL es suficiente (Neon, Supabase) |
| Despliegue sin servidor propio | 100% serverless-first, funciona en Vercel / Cloudflare |
| Equipo técnico + editores de contenido | Builder Mode (admin) vs Content Mode (editor), misma app |
| Subir imágenes/video | Integración con Cloudflare R2 (opcional) |
| Emails transaccionales | Resend integrado para reset y bienvenida (opcional) |

### La analogía del tablero

> El tablero principal es una **mesa de póker infinita**.
> Un nodo contenedor es un **mazo**: representa una tabla en tu base de datos (Artículos, Productos, Usuarios...).
> Cada carta dentro del mazo es un **campo**: texto, número, booleano, imagen, video o relación.
> Las conexiones entre mazos son las **relaciones** entre tablas.
> Cuando entras a un mazo, ves todas sus cartas. El breadcrumb te dice dónde estás.

---

### Pila tecnológica

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16+ (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript 6 (strict) |
| Estilos | TailwindCSS v4 + shadcn/ui |
| Base de datos | PostgreSQL: Neon o Supabase |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (NextAuth) |
| Storage | Cloudflare R2 (opcional) |
| Email | Resend (opcional) |
| Estado UI | Zustand v5 |
| Despliegue | Vercel / Cloudflare / Netlify |

---

### Requisitos

- Node.js 20+
- pnpm
- Una base de datos PostgreSQL (Neon, Supabase u otra)

### Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

#### Obligatorias

```env
# URL de conexión a PostgreSQL
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Proveedor: "neon" o "supabase"
DB_PROVIDER=neon

# Secreto para sesiones (genera uno con: openssl rand -base64 32)
AUTH_SECRET=tu_secreto_aqui

# URL base de la app (sin trailing slash)
AUTH_URL=https://tu-dominio.com
```

#### Opcionales

```env
# ── Cloudflare R2 (media/storage) ──────────────────────────────
# Sin estas vars, la subida de imágenes y video queda deshabilitada.
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.tu-dominio.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# ── Resend (correos transaccionales) ───────────────────────────
# Sin estas vars, los emails de bienvenida y reset de contraseña
# no se envían (el flujo igual funciona, solo sin correo).
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=no-reply@tu-dominio.com

# ── VPS de optimización de media (opcional) ────────────────────
# Segunda pasada de compresión de imágenes antes de subir a R2.
# Sin esto, solo se usa la compresión client-side (siempre activa).
MEDIA_VPS_URL=https://optimus.tu-vps.com
MEDIA_VPS_KEY=
```

---

### Instalación y arranque local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/cartum.git
cd cartum

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Iniciar en modo desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000), el wizard de configuración inicial te guía el resto del proceso.

---

### Despliegue en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com)
2. En **Settings → Environment Variables**, agrega al menos `DATABASE_URL`, `DB_PROVIDER`, `AUTH_SECRET` y `AUTH_URL` (con tu dominio de producción)
3. Para la base de datos puedes usar el **integration de Neon de Vercel**, desde el dashboard de Vercel → Storage → Create → Neon. La variable `DATABASE_URL` se inyecta automáticamente
4. Deploy. Vercel detecta Next.js automáticamente

> No se necesita configuración adicional de build. El `pnpm db:migrate` puede correrse desde la CLI de Vercel o ejecutarse como parte del build command: `pnpm db:migrate && next build`

---

### Despliegue en Cloudflare Pages

1. Conecta tu repositorio en [pages.cloudflare.com](https://pages.cloudflare.com)
2. Framework preset: **Next.js**
3. Build command: `pnpm db:migrate && next build`
4. Variables de entorno: igual que en Vercel, agrega `DATABASE_URL`, `DB_PROVIDER`, `AUTH_SECRET`, `AUTH_URL`
5. Para la base de datos usa **Neon** (funciona con Cloudflare sin cambios) o **Supabase** con `DB_PROVIDER=supabase`

> R2 nativo de Cloudflare es compatible, puedes usar el mismo bucket tanto para el hosting como para el storage del CMS.

---

### API REST

Una vez configurado el schema en el tablero, la API está disponible en:

```
GET    /api/v1/schema               → listar todos los nodos con sus campos
GET    /api/v1/[nodeName]           → listar registros (paginado)
GET    /api/v1/[nodeName]/[id]      → registro individual
POST   /api/v1/[nodeName]           → crear registro
PUT    /api/v1/[nodeName]/[id]      → actualizar registro (completo)
PATCH  /api/v1/[nodeName]/[id]      → actualizar registro (parcial)
DELETE /api/v1/[nodeName]/[id]      → eliminar registro
```

`[nodeName]` es el slug del nodo contenedor raíz (ej: "Blog Posts" → `/api/v1/blog-posts`).

La autenticación es por **API token**, se genera desde Settings → API Tokens en el CMS.

```bash
# Descubrir qué nodos y campos existen
curl https://tu-dominio.com/api/v1/schema \
  -H "Authorization: Bearer <token>"

# Listar registros de un nodo
curl https://tu-dominio.com/api/v1/products \
  -H "Authorization: Bearer <token>"
```

---

### Scripts disponibles

```bash
pnpm dev           # Desarrollo local
pnpm build         # Build de producción
pnpm start         # Iniciar build de producción
pnpm db:generate   # Generar migraciones Drizzle
pnpm db:migrate    # Aplicar migraciones
pnpm db:studio     # Drizzle Studio (explorador visual de DB)
```

---

### Notas de configuración

#### `proxyClientMaxBodySize` (Next.js 16)

Next.js 16 introduce un sistema de buffering automático del body de las requests para soportar el mecanismo `proxy.ts`. Por defecto el límite es **10 MB**, lo que trunca los chunks de video antes de que lleguen al route handler.

Este proyecto lo eleva a **100 MB** en `next.config.ts`:

```ts
experimental: {
  proxyClientMaxBodySize: '100mb',
}
```

Sin esto, los uploads de video fallan silenciosamente: el chunk llega truncado al proxy interno, FastAPI recibe un multipart incompleto y devuelve `422 Field required` para el campo `chunk`. El error en la consola del servidor es:

```
Request body exceeded 10MB for /api/internal/media/videos/chunk.
Only the first 10MB will be available...
```

---

### Manejo de errores

Al instalar y ejecutar Cartum por primera vez, el sistema corre una secuencia de arranque (**boot sequence**) que verifica que todas las variables de entorno necesarias estén presentes y correctamente configuradas. Si algo falla, el servidor no inicia y emite un mensaje con el siguiente formato:

```
✖ [CARTUM_EXXX] Descripción del problema.
  → What this means: ...
  → How to fix: ...
  → Reference: errores_info.md#cartum_exxx
```

Los códigos van de errores fatales (el servidor no arranca) a advertencias (el servidor arranca pero con funcionalidad reducida). Consulta la referencia completa en [errores_info.md](errores_info.md).

---

## English

- [What is Cartum?](#what-is-cartum)
- [What problems does it solve?](#what-problems-does-it-solve)
- [The board analogy](#the-board-analogy)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Configuration Notes](#configuration-notes)
- [Deploy to Vercel](#deploy-to-vercel)
- [Deploy to Cloudflare Pages](#deploy-to-cloudflare-pages)
- [REST API](#rest-api)
- [Available Scripts](#available-scripts)
- [Error Handling](#error-handling)

---

### What is Cartum?

Cartum is a **serverless-first headless CMS with visual data modeling**. Built for small teams and developers who need a flexible, lightweight content backend deployable on serverless platforms (Vercel, Cloudflare, Netlify), without the complexity and weight of solutions like Strapi or Directus.

The main interface is an **infinite node board**, where modeling your database is as intuitive as sitting at a poker table: the board is the table, container nodes are the decks, and each card inside a deck is a data field (text, number, image, video, relation...). You define the structure visually and Cartum auto-generates the REST API.

### What problems does it solve?

| Need | How Cartum addresses it |
|---|---|
| Model data without writing SQL | Visual node board with drag & drop connections |
| REST API without extra code | Auto-generated from the visual schema |
| CMS without managing your own DB | A single PostgreSQL URL is enough (Neon, Supabase) |
| Deploy without a dedicated server | 100% serverless-first, works on Vercel / Cloudflare |
| Technical team + content editors | Builder Mode (admin) vs Content Mode (editor), same app |
| Image/video uploads | Cloudflare R2 integration (optional) |
| Transactional emails | Resend integration for resets and welcome emails (optional) |

### The board analogy

> The main board is an **infinite poker table**.
> A container node is a **deck**: it represents a database table (Articles, Products, Users...).
> Each card inside the deck is a **field**: text, number, boolean, image, video, or relation.
> Connections between decks define **relationships** between tables.
> When you enter a deck, you see all its cards. The breadcrumb tells you where you are.

---

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router, Server Components, Server Actions) |
| Language | TypeScript 6 (strict) |
| Styles | TailwindCSS v4 + shadcn/ui |
| Database | PostgreSQL: Neon or Supabase |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (NextAuth) |
| Storage | Cloudflare R2 (optional) |
| Email | Resend (optional) |
| UI State | Zustand v5 |
| Deployment | Vercel / Cloudflare / Netlify |

---

### Requirements

- Node.js 20+
- pnpm
- A PostgreSQL database (Neon, Supabase or any other provider)

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

#### Required

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
DB_PROVIDER=neon          # or "supabase"
AUTH_SECRET=              # openssl rand -base64 32
AUTH_URL=https://your-domain.com
```

#### Optional

```env
# Cloudflare R2: without these, media uploads are disabled
R2_ENDPOINT=
R2_PUBLIC_URL=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Resend: without these, emails are skipped (flows still work)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# VPS media optimizer: extra compression pass before R2 upload
MEDIA_VPS_URL=
MEDIA_VPS_KEY=
```

---

### Local Setup

```bash
git clone https://github.com/your-org/cartum.git
cd cartum
pnpm install
cp .env.example .env   # fill in your values
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), the setup wizard will guide you through the rest.

---

### Deploy to Vercel

1. Import the repository at [vercel.com](https://vercel.com)
2. Add environment variables: `DATABASE_URL`, `DB_PROVIDER`, `AUTH_SECRET`, `AUTH_URL`
3. Optionally use **Vercel's Neon integration** (Storage → Create → Neon), injects `DATABASE_URL` automatically
4. Deploy. Vercel auto-detects Next.js

> Optional build command to auto-migrate: `pnpm db:migrate && next build`

---

### Deploy to Cloudflare Pages

1. Connect your repo at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Framework preset: **Next.js**
3. Build command: `pnpm db:migrate && next build`
4. Add the same environment variables as above
5. Use **Neon** or **Supabase** as the database, both work without changes

---

### REST API

Once you define your schema on the board, the API is available at:

```
GET    /api/v1/schema               → list all nodes with their fields
GET    /api/v1/[nodeName]           → list records (paginated)
GET    /api/v1/[nodeName]/[id]      → single record
POST   /api/v1/[nodeName]           → create record
PUT    /api/v1/[nodeName]/[id]      → full update
PATCH  /api/v1/[nodeName]/[id]      → partial update
DELETE /api/v1/[nodeName]/[id]      → delete record
```

Authenticate using an **API token** generated from Settings → API Tokens:

```bash
# Discover which nodes and fields exist
curl https://your-domain.com/api/v1/schema \
  -H "Authorization: Bearer <token>"

# List records from a node
curl https://your-domain.com/api/v1/products \
  -H "Authorization: Bearer <token>"
```

---

### Available Scripts

```bash
pnpm dev           # Local development
pnpm build         # Production build
pnpm start         # Start production server
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Apply migrations
pnpm db:studio     # Drizzle Studio (visual DB explorer)
```

---

### Configuration Notes

#### `proxyClientMaxBodySize` (Next.js 16)

Next.js 16 introduces automatic request body buffering to support the `proxy.ts` mechanism. The default limit is **10 MB**, which truncates video chunks before they reach the route handler.

This project raises it to **100 MB** in `next.config.ts`:

```ts
experimental: {
  proxyClientMaxBodySize: '100mb',
}
```

Without this, video uploads fail silently: the chunk is truncated at the internal proxy layer, FastAPI receives an incomplete multipart body and returns `422 Field required` for the `chunk` field. The server console shows:

```
Request body exceeded 10MB for /api/internal/media/videos/chunk.
Only the first 10MB will be available...
```

---

### Error Handling

On first install and startup, Cartum runs a **boot sequence** that validates all required environment variables are present and correctly configured. If anything fails, the server won't start and emits a message in the following format:

```
✖ [CARTUM_EXXX] Description of the problem.
  → What this means: ...
  → How to fix: ...
  → Reference: errores_info.md#cartum_exxx
```

Codes range from fatal errors (server won't start) to warnings (server starts with reduced functionality). See the full reference at [errores_info.md](errores_info.md).

---

<p align="center">
  <sub>Built with the serverless stack. Inspired by Strapi. Designed for the edge.</sub>
</p>
