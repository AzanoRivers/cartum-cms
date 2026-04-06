---
applyTo: "**"
---

# Cartum — Instrucciones de UI siempre activas

Estas reglas aplican a **todo** código generado en **Cartum**, sin excepción.

## Estructura de componentes

- `/components/ui/` → ComponentesUI custom del sistema (átomos, moléculas, organismos, transiciones, layouts)
- `/components/external/` → ComponentesExternos: wrappers sobre librerías third-party (un subdirectorio por librería)
- `/app/` → Views: páginas Next.js que solo componen organisms, sin lógica propia
- `/lib/` → Controllers: hooks, Server Actions, servicios
- `/types/` → Models: todos los TypeScript types e interfaces

## Reglas absolutas

1. **Toda nueva pantalla o contenido significativo usa `<VHSTransition>`** — efecto de entrada estilo VHS/cyberpunk (scanlines + RGB shift + glitch). Nunca omitirlo en páginas nuevas o paneles principales.
2. **Custom primero**: crear componentes propios antes de usar una librería externa. Excepción permitida: drag & drop con `@dnd-kit`.
3. **Todo drag & drop pasa por wrappers en `/components/external/dnd/`** — nunca usar `@dnd-kit` directamente en páginas o componentes UI.
4. **Sin lógica en Views**: las páginas en `/app/` solo componen. La lógica va en hooks en `/lib/hooks/`.
5. **Variantes con `cva()`** de `class-variance-authority` — no props booleanas sueltas para estilos.
6. **Todos los tipos en `/types/`** — nunca tipos inline dentro de componentes.
7. **Paleta de color del sistema** — no valores de color hardcodeados. Usar variables CSS o clases Tailwind del tema definido.

## Estética obligatoria

- Dark-first, minimalista, node-board aesthetic
- Cards como unidad base de contenido
- Espacios limpios, tipografía monospace para labels técnicos
- Responsive: sidebar + contenido en desktop, navegación inferior en mobile
