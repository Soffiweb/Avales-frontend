# Frontend

## Next.js

- No marcar paginas completas con `use client` sin necesidad.
- Preferir Server Components para lecturas cuando no haya interaccion compleja.
- Usar Client Components cuando haya formularios, estado local, autosave o interacciones reales.

## Datos

- Toda llamada HTTP pasa por `lib/api/*`.
- Reutilizar `apiFetch`, tipos y normalizaciones existentes.
- Para server-state usar TanStack Query si la pantalla tiene cache, refetch, invalidacion o mutaciones.
- Para listados, preservar el patron vigente de filtros, paginacion y URL state.

## Componentes

- Si el archivo mezcla fetch, DTO mapping, render y reglas de negocio, separar.
- Extraer hooks cuando haya logica reutilizable o demasiado estado.
- Extraer helpers cuando haya transformaciones de payload, normalizacion o defaults repetidos.
- Mantener componentes presentacionales sin reglas de negocio pesadas.

## Formularios

- Usar React Hook Form + Zod.
- Mantener valores por defecto y transformaciones fuera del JSX si empiezan a crecer.
- El mapping form -> payload debe ser claro y tipado.

## Tipado y limpieza

- Evitar `any`.
- Evitar casts innecesarios.
- No dejar imports muertos.
- No dejar logs de debug.
- Reutilizar constantes antes de hardcodear tiempos, limites o labels.

## Referencias del repo

- CRUD simple: `app/(app)/deportistas/`
- CRUD con update variante: `app/(app)/usuarios/`
- API client y proxy: `lib/api/client.ts`
