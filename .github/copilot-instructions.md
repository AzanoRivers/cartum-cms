# Cartum — Copilot Instructions

## Project Overview

**Cartum** is a serverless-first, headless CMS + visual data modeling platform.
It combines visual database modeling (nodes/relationships), auto-generated REST APIs,
a CMS interface, media processing, and serverless deployment.

## Tech Stack

- **Framework**: Next.js 15+ (App Router, Server Components, Route Handlers)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS v4 + shadcn/ui
- **Database**: PostgreSQL via **Neon** (primary) or **Supabase** (adapter)
- **ORM**: Drizzle ORM
- **Storage**: Cloudflare R2
- **Media optimization**: `browser-image-compression` + `ffmpeg.wasm` (client-side, always active) → optional VPS API (URL + API key configured in CMS settings)
- **Deployment**: Vercel / Cloudflare / Netlify (serverless-first)

## Architecture

```
/app          → Next.js App Router pages & layouts
/lib          → Shared utilities, helpers
/api          → Route Handler logic
/db           → Drizzle schema, migrations, adapters (neon | supabase)
/nodes        → Node system: models, fields, relations, records
/components   → React UI components (shadcn/ui + custom)
```

## Core Concepts

- **Node** = database table/model
- **Field** = column (types: string, number, boolean, relation, media)
- **Connection** = foreign key relationship
- **Record** = row stored as JSONB for flexibility

## Coding Guidelines

- Always use TypeScript strict types — no `any`
- Use Next.js App Router patterns (Server Components by default, `"use client"` only when necessary)
- Use Tailwind utility classes; avoid inline styles
- Use shadcn/ui components before building custom ones
- Database queries via Drizzle ORM; never raw SQL strings unless necessary
- All DB operations must be async/await with proper error handling
- Environment-based DB adapter: `DB_PROVIDER=neon|supabase`
- Follow serverless constraints: stateless, short-lived functions, no persistent in-memory state

## Active Skills

The following skills are installed and active for this project:

| Skill | Purpose |
|---|---|
| `vercel-react-best-practices` | React patterns, performance, composition |
| `nextjs-app-router-patterns` | Next.js App Router, RSC, streaming |
| `nextjs-developer` | Next.js development patterns |
| `typescript-advanced-types` | TypeScript strict typing, generics, utility types |
| `astro` | Astro framework (for future static/marketing sites) |
| `tailwindcss-advanced-layouts` | TailwindCSS layouts, responsive design |
| `shadcn-ui` | shadcn/ui component library patterns |
| `supabase-postgres-best-practices` | PostgreSQL schema design, RLS, indexes |
| `supabase-nextjs` | Supabase + Next.js integration patterns |
| `bencium-innovative-ux-designer` | UX design principles for CMS interfaces |
| `design-system` | Design system architecture |
| `caveman` | Extremely concise, "caveman" style responses (max 1–2 lines) |

## Do NOT

- Do not use Pages Router (`/pages` directory)
- Do not use `getServerSideProps` or `getStaticProps`
- Do not use class components
- Do not use `var`; use `const`/`let`
- Do not commit `.env` files
