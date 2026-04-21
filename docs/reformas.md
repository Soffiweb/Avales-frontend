# Reformas (API)

## Estados

- `PENDIENTE` → `APROBADA` | `RECHAZADA`

## Endpoints

### GET `/reforms`

Lista reformas (orden sugerido: `PENDIENTE`, `APROBADA`, `RECHAZADA`).

Query (opcional):
- `eventoId`: filtra por evento.
- `estado`: filtra por estado.

### GET `/reforms/:id`

Detalle de reforma. Incluye:
- `cambiosPropuestos` (JSON crudo)
- `cambiosPropuestosLegibles` (campos/items listos para UI)
- `comparacion` (antes/después, si aplica)

### POST `/reforms`

Crea una solicitud de reforma.

Flujo (nuevo, 2 versiones):
- Crea la **versión propuesta** (siguiente `EventoVersion`, ej. `v2`) aplicando `cambiosPropuestos` sobre el evento actual.
- `versionBaseId` apunta a la **última versión existente** (normalmente `v1`). No crea snapshot “base” extra.

Body:
```json
{
  "eventoId": 123,
  "motivo": "Corrección de fechas",
  "observacion": "Opcional",
  "versionBaseId": 456,
  "cambiosPropuestos": {
    "fechaInicio": "2026-05-06T00:00:00.000Z",
    "fechaFin": "2026-05-08T00:00:00.000Z",
    "eventoItems": [
      { "itemId": 1, "mes": 5, "presupuesto": 1000 }
    ]
  }
}
```

Errores típicos:
- `403`: sin permiso para solicitar.
- `404`: evento no existe.
- `409`: ya existe una reforma `PENDIENTE` para el evento.

### PATCH `/reforms/:id/aprobar`

Aprueba y aplica los cambios finales al evento.

Flujo:
- No crea `EventoVersion`.
- Aplica al evento la **versión propuesta** ya creada en `POST /reforms` y marca la reforma como `APROBADA`.

Body: opcional (puede ser `{}` o vacío). Si se envía, solo se usa metadata (ej. `usuarioId` deprecated).

Errores típicos:
- `400`: reforma sin versión propuesta / datos inválidos.
- `409`: ya no está `PENDIENTE` o existe conflicto de reforma pendiente.

### PATCH `/reforms/:id/rechazar`

Rechaza la solicitud.

Body:
```json
{ "observacion": "Motivo del rechazo" }
```

Errores típicos:
- `409`: no está `PENDIENTE`.

## Nota (frontend)

El frontend envía:
- Aprobar: `PATCH /reforms/:id/aprobar` sin body (ver `lib/api/reforms.ts`).
- Rechazar: `PATCH /reforms/:id/rechazar` con body `{ observacion }`.
