# CLAUDE.md

Frontend en Next.js (App Router) + TypeScript. Consume API REST de NestJS en `NEXT_PUBLIC_API_URL`.

## Comandos

- `pnpm dev` — desarrollo en localhost:4000
- `pnpm build` — producción
- `pnpm lint` — ESLint

## Stack

- Next.js 16, React 19, TypeScript 5
- Tailwind CSS v4, Lucide React
- React Hook Form + Zod v4
- TanStack Query v5
- Headless UI, Radix UI Popover

## Variables de Entorno

- `NEXT_PUBLIC_API_URL` — URL base de la API
- `JWT_SECRET` — Secret para JWT

## Módulos de referencia

- CRUD simple → `app/(app)/deportistas/`
- CRUD con password opcional en update → `app/(app)/usuarios/`

## Contexto del negocio

Ver `docs/NEGOCIO.md`

## Standards de desarrollo

Antes de escribir o modificar código, leer:

1. `.agents/skills/soffiweb-avales-frontend-standards/SKILL.md` — reglas maestras, flujo obligatorio y reglas duras
2. `.agents/skills/soffiweb-avales-frontend-standards/references/frontend.md` — Next.js, datos, componentes, formularios
3. `.agents/skills/soffiweb-avales-frontend-standards/references/checklist.md` — checklist de cierre

Leer `references/backend.md` y `references/architecture.md` solo si la tarea toca contratos de API, BFF/proxy o decisiones estructurales.
