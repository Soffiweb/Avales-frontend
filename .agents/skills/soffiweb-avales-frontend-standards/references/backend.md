# Backend NestJS

## Estructura

- Separar modulo, controller, service y DTO.
- Validacion explicita con `class-validator`.
- No poner logica de negocio pesada en controllers.
- Mantener contratos claros entre frontend y backend.

## Prisma

- Evitar N+1.
- Cargar relaciones solo cuando hagan falta.
- Mantener queries legibles y consistentes.
- Pensar en impacto multi-tenant cuando la entidad lo requiera.

## Contratos API

- Si el frontend ya normaliza una respuesta, no romper esa forma sin motivo.
- Mantener nombres y tipos consistentes entre DTO, `lib/api/*` y UI.
- Si un endpoint cambia, revisar el wrapper frontend correspondiente antes de tocar componentes.

## Casos especiales

- Uploads, Excel, PDF, mail y procesos largos suelen justificar BFF explicito en Next.
- Si el cambio toca auth, roles o cookies, revisar antes el flujo completo frontend -> Next -> Nest.
