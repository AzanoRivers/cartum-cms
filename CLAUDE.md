# Cartum CMS — Claude Code Instructions

## Project Overview

**Cartum** es un CMS headless + plataforma de modelado visual de datos, serverless-first.
Combina modelado visual de base de datos (nodos/relaciones), APIs REST auto-generadas,
interfaz CMS, procesamiento de media y despliegue serverless.

## Tech Stack

- **Framework**: Next.js 15+ (App Router, Server Components, Route Handlers)
- **Language**: TypeScript (strict mode — sin `any`)
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Database**: PostgreSQL via **Neon** (primario) o **Supabase** (adaptador)
- **ORM**: Drizzle ORM
- **Storage**: Cloudflare R2
- **Media**: `browser-image-compression` + `ffmpeg.wasm` (client-side) → VPS API opcional
- **Deployment**: Vercel / Cloudflare / Netlify (serverless-first)

## Arquitectura

```
/app          → Next.js App Router: páginas y layouts (solo composición, sin lógica)
/components   → React UI: /ui/ (átomos/moléculas/organismos) + /external/ (wrappers libs)
/lib          → Controllers: hooks, Server Actions, servicios
/types        → Models: todos los TypeScript types e interfaces
/db           → Drizzle schema, migraciones, adaptadores (neon | supabase)
/nodes        → Sistema de nodos: modelos, campos, relaciones, records
/features     → Feature modules
/locales      → i18n
```

## Conceptos Core

- **Node** = tabla/modelo de base de datos
- **Field** = columna (tipos: string, number, boolean, relation, media)
- **Connection** = relación de clave foránea
- **Record** = fila almacenada como JSONB

## Reglas de Código

- TypeScript strict — nunca `any`, nunca tipos inline en componentes
- App Router siempre (`app/`), nunca Pages Router (`pages/`)
- Server Components por defecto; `"use client"` solo en el leaf boundary donde se necesita interactividad
- Tailwind utility classes; sin estilos inline
- shadcn/ui antes de componentes custom
- Queries DB via Drizzle ORM; nunca SQL strings raw salvo necesidad
- Todas las operaciones DB: async/await con manejo de errores
- `DB_PROVIDER=neon|supabase` para el adaptador
- Serverless constraints: funciones stateless, sin estado persistente en memoria

## Prohibiciones

- No usar Pages Router (`/pages/`)
- No usar `getServerSideProps` / `getStaticProps`
- No usar class components
- No usar `var` — usar `const`/`let`
- No commitear `.env`

---

## Agente UI: Cartum UI Architect

@.github/agents/cartum-ui-architect.md

---

## Reglas UI Siempre Activas

@.github/instructions/ui-rules.instructions.md

---

## Skills Activos

Los siguientes skills están activos para este proyecto. Aplícarlos cuando sea relevante.

### Next.js & React

@.claude/skills/nextjs-developer.md

@.claude/skills/nextjs-app-router-patterns.md

@.claude/skills/vercel-react-best-practices.md

### TypeScript

@.claude/skills/typescript-advanced-types.md

### Styling & UI

@.claude/skills/tailwindcss-advanced-layouts.md

@.claude/skills/shadcn-ui.md

@.claude/skills/design-system.md

@.claude/skills/bencium-innovative-ux-designer.md

### Database & Backend

@.claude/skills/supabase-postgres-best-practices.md

@.claude/skills/supabase-nextjs.md

---

## Referencias Detalladas de Skills (on-demand)

Cuando necesites reglas específicas, lee los archivos de referencia globales:

| Skill | Referencias |
|-------|-------------|
| Next.js Developer | `C:/Users/andro/.agents/skills/nextjs-developer/references/` |
| Vercel React | `C:/Users/andro/.agents/skills/vercel-react-best-practices/rules/` |
| Supabase Postgres | `C:/Users/andro/.agents/skills/supabase-postgres-best-practices/references/` |
| shadcn/ui | `C:/Users/andro/.agents/skills/shadcn-ui/references/` |
| bencium UX | `C:/Users/andro/.agents/skills/bencium-innovative-ux-designer/` |
| caveman | `C:/Users/andro/.agents/skills/caveman/SKILL.md` | 
