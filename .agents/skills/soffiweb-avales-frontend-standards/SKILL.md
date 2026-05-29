---
name: soffiweb-avales-frontend-standards
description: "Usar en tareas de generacion o refactor de codigo para Soffiweb Avales con Next.js, TypeScript y backend NestJS. Aplica estandares de arquitectura, estructura, BFF/proxy, hooks reutilizables, formularios, server-state y bajo consumo de tokens. Trigger: crear componentes, hooks, modulos, endpoints, servicios, formularios, listados, flujos de aprobacion, refactors o decisiones de arquitectura en el ecosistema Soffiweb Avales."
license: MIT
metadata:
  author: soffiweb
  version: "1.0"
---

# Soffiweb Avales Standards

## Regla maestra

Antes de escribir codigo, inspecciona el repo y extiende patrones existentes. Prioriza simplicidad, consistencia y bajo consumo de tokens.

## Modo ahorro de tokens

- Usa `rg` antes de abrir archivos.
- Lee solo archivos puntuales y relevantes.
- No cargues archivos grandes completos si una busqueda basta.
- No repitas contexto ya conocido.
- Si el cambio es local, no leas modulos no relacionados.
- Usa primero estas referencias:
  - `CLAUDE.md` para stack y comandos
  - `docs/NEGOCIO.md` solo si la tarea toca flujos, roles o dominio de avales
  - `app/(app)/deportistas/` para CRUD simple
  - `app/(app)/usuarios/` para CRUD con variantes de update

## Flujo obligatorio

1. Buscar implementaciones similares.
2. Detectar el patron vigente del modulo.
3. Reutilizar helpers, hooks, `lib/api/*`, constantes y tipos existentes.
4. Elegir la solucion mas pequena que preserve consistencia.
5. Escribir codigo.
6. Verificar imports muertos, `any`, logs, duplicacion y hardcodes.

## Reglas duras

- No introducir abstracciones nuevas sin necesidad real.
- No duplicar codigo si ya existe un patron equivalente.
- No usar `any` salvo bloqueo real y justificado.
- No dejar `console.log`.
- No mezclar render, fetch y logica compleja en archivos gigantes si el archivo ya pide separacion.
- No llamar directo al backend si el proyecto para ese caso usa `lib/api/*` y proxy/BFF de Next.
- No romper la arquitectura actual por seguir una arquitectura idealizada.

## Que revisar segun el tipo de tarea

- Frontend y arquitectura: `references/frontend.md`
- Backend NestJS y contratos: `references/backend.md`
- Dominio y decisiones estructurales: `references/architecture.md`
- Cierre de tarea: `references/checklist.md`

## Criterio de decision

Si hay varias opciones validas, elige la mas simple, la que menos codigo introduce y la que mas se parezca al patron ya usado en este repo.
