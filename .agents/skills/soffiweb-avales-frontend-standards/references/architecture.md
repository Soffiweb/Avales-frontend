# Arquitectura

## Stack real

- Frontend: Next.js 16 App Router, React 19, TypeScript 5
- UI: Tailwind v4, Lucide, Headless UI, Radix Popover
- Formularios: React Hook Form + Zod
- Server-state: TanStack Query v5
- Backend: NestJS 11 + Prisma
- Infra: SaaS multi-tenant, microservicios progresivos

## Reglas estructurales

- Preferir `lib/api/*` para acceso HTTP.
- Reutilizar hooks genericos antes de crear hooks nuevos.
- Si una pagina crece demasiado, separar container, hook y componentes presentacionales.
- Mantener modulos por feature cuando el repo ya lo sugiera.
- Los cambios deben ser de bajo impacto y faciles de revisar.

## BFF / Proxy

- Cliente y SSR deben entrar por Next cuando la convencion vigente use `/api/v1`.
- No inventar rutas paralelas si el `rewrite` o handler existente ya cubre el caso.
- Crear route handlers explicitos solo cuando se necesite logica BFF real: upload, composicion, auth especial, adaptacion de payload o seguridad.

## Dominio de avales

Leer `docs/NEGOCIO.md` solo si la tarea toca:

- flujos por rol
- aprobaciones / rechazos
- tipos de aval
- notificaciones entre etapas
- restricciones por area metodologica o administrativa

Resumen minimo:

- Un aval es un expediente digital para participacion deportiva.
- Hay flujos metodologicos y administrativos por rol.
- Los rechazos pueden regresar a una etapa anterior.
- Un usuario puede tener multiples roles.
