# Migración FormaParticipacion — Frontend (coexistencia aditiva)

> Estado: alineado a backend PR #89 (`Avales-backend`, rama
> `feature/forma-participacion`, Fases 1-5 completas y gateadas).

## Contexto

El backend implementó `FormaParticipacion*` como espejo operacional
**ADICIONAL**, indexado por `eventoId + tipoAval`. Es 100% aditivo — no
reemplaza nada del contrato legacy:

- `Evento.numAtletas*/numEntrenadores*/eventoItems/presupuestosFuente`
- `EventoItem.fuente`
- `Aval.evento: EventoSimple`
- `CreateColeccionAvalPayload: { eventoId, tipoAval, montoSolicitado? }`
- `CreateEventoPayload` (sigue con `numAtletas*/numEntrenadores*/eventoItems`)

El plan anterior de este doc (expand-and-contract: `Evento.formas[]`,
`Aval.formaParticipacion`, `formaParticipacionId`, sin endpoint v2 "rompe
compilación a propósito") **no corresponde al backend shippeado**. Es la
"Fase 8 — Contractiva" del backend, explícitamente en pausa indefinida y
requiere decisión futura explícita.

El 2026-06-12 se revirtió en frontend el WIP de ese plan (26 archivos,
~400 líneas) — queda preservado en `git stash@{0}` de este repo por si se
necesita referencia, pero no debe re-aplicarse tal cual.

## Contrato real (único cambio nuevo para frontend)

Campo nuevo, opcional, aditivo, ya agregado a `types/aval.ts`:

```ts
// EventoSimple
formaParticipacionActual?: FormaParticipacionResumen;

export type FormaParticipacionResumen = {
  id: number;
  tipoAval: TipoAval;
  numEntrenadoresHombres: number;
  numEntrenadoresMujeres: number;
  numAtletasHombres: number;
  numAtletasMujeres: number;
  presupuestoTotal?: string | null;
  estado: Estado;
  items: PresupuestoItem[];
};
```

Resumen de la `FormaParticipacion` del `tipoAval` del aval actual —
disponible en `GET /avales/:id` vía `AvalResponseDto.evento.formaParticipacionActual`.

## Próximos pasos posibles (opcionales, baja prioridad)

Backend Fase 7 ("Frontend y extras"): "el frontend sigue sin v2 ... solo se
cambian payloads cuando el reader backend ya esté estabilizado."

Usos posibles de `formaParticipacionActual` (sin romper nada legacy):

- ✅ Mostrar cupos/presupuesto por `tipoAval` en avales mixtos, donde hoy se
  usa `evento.numAtletas*` event-wide (impreciso para mixtos). Hecho
  (2026-06-12) vía `getAvalCupos`/`getAvalPresupuestoItems` en
  `lib/utils/aval-collections.ts`, usados en `avales/[id]/page.tsx` y
  `aval-document-preview.tsx`. Caen a los campos legacy de `evento` si
  `formaParticipacionActual` no viene poblado o no coincide con
  `aval.tipoAval` — sin riesgo de regresión.

  `paso-01-deportistas.tsx` migrado vía cupos (ver punto siguiente).
  `paso-04-presupuesto.tsx` migrado (2026-06-12): `presupuestoItems` ahora
  sale de `getAvalPresupuestoItems(aval)` y luego se filtra por `fuente` igual
  que antes. Para `SOLO_RESULTADO` (`presupuestoFuente = null`) el resultado
  de `presupuestoItems`/`getTotalPresupuesto()` no se renderiza ni se usa
  (solo alimenta `getTotalOriginalManual(aval, false, ...)`, que devuelve 0
  para no-AUTOGESTION) — así que la semántica de `formaParticipacionActual.items`
  para `SOLO_RESULTADO` no afecta la UI, sea cual sea. Para FONDOS_PUBLICOS/
  AUTOGESTION usa `forma.items` (mismo `tipoAval`, con cupos > 0) o cae a
  `evento.presupuesto` — mismo riesgo cero por fallback que los otros usos.

- ✅ Validación cliente de cupos por `tipoAval` antes de enviar (espejo de
  `validateAthleteQuota`/`validateCoachQuota` de `aval-validation.service.ts`
  Fase 3 del backend). Hecho (2026-06-12): `paso-01-deportistas.tsx` ahora usa
  `getAvalCupos(aval)` para `totalDeportistasRequeridos`/
  `totalEntrenadoresRequeridos` (antes `evento.numAtletas*`/`numEntrenadores*`
  event-wide), igual que el backend usa los cupos de la `FormaParticipacion`
  del `tipoAval` cuando tiene counts > 0. `getFormaParticipacionActual` ahora
  también espeja el guard `formaTieneCounts` del backend: si la forma coincide
  en `tipoAval` pero tiene los 4 contadores en 0, cae a `evento.*` (igual que
  el backend cae a los contadores del evento en ese caso). No cubre
  `validateBudgetByTipo` (presupuesto por `fuente`) — sigue ligado al punto
  anterior sobre `paso-04-presupuesto.tsx`.

## Fuera de alcance

- Renombrar/eliminar campos legacy (Fase 8 backend, pausa indefinida).
- `Evento.formas[]`, `Aval.formaParticipacion`,
  `CreateColeccionAvalPayload.formaParticipacionId` — no existen en backend.
- Reformas: backend en migración, sin contrato estable para frontend aún.

## Referencias

- Backend: `Avales-backend/docs/forma-participacion/README.md`
  (rama `feature/forma-participacion`, PR #89).
- WIP descartado (Fase 0 expand-and-contract, 26 archivos):
  `git stash list` → `stash@{0}` (2026-06-12).
