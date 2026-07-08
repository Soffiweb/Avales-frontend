# Reformas (API)

## Estados

- `PENDIENTE` → `APROBADA` | `RECHAZADA`

## Modelo unificado (evento único / multi-evento)

Una reforma ya no está atada a un solo evento. Puede combinar:
- `eventos[]`: ediciones de datos/presupuesto sobre uno o más eventos (lo que antes era "reforma" de un solo evento).
- `eventosOrigen[]` / `eventosDestino[]`: movimientos de presupuesto entre formas de participación de distintos eventos (lo que antes era "reforma multi-evento").

Las rutas HTTP no cambiaron. Una misma reforma puede traer los tres arrays a la vez.

## Endpoints

### GET `/reforms`

Lista reformas (orden sugerido: `PENDIENTE`, `APROBADA`, `RECHAZADA`).

Query (opcional):
- `eventoId`: filtra por evento (matchea si el evento aparece en `eventos`, `eventosOrigen` o `eventosDestino`).
- `estado`: filtra por estado.
- `tipo`: filtra por `TipoReforma` (`DATOS_INFORMATIVOS` | `PRESUPUESTO` | `MIXTA`), solo aplica a reformas con ediciones de evento.

### GET `/reforms/:id`

Detalle de reforma. Ya no expone `eventoId`/`cambiosPropuestos`/`tipo`/`comparacion`/`evento` a nivel raíz. En su lugar:

```json
{
  "id": 10,
  "estado": "PENDIENTE",
  "motivo": "Corrección de fechas y traslado de presupuesto",
  "mesEjecucion": 7,
  "eventos": [
    {
      "id": 1,
      "eventoId": 123,
      "tipo": "MIXTA",
      "versionBaseId": 456,
      "versionAprobadaId": null,
      "cambiosPropuestos": { "fechaInicio": "2026-05-06T00:00:00.000Z" },
      "cambiosPropuestosLegibles": { "campos": [ { "campo": "fechaInicio", "etiqueta": "Fecha inicio", "valor": "06/05/2026" } ] },
      "comparacion": {
        "campos": [ { "campo": "fechaInicio", "etiqueta": "Fecha inicio", "antes": "2026-05-01", "despues": "2026-05-06" } ],
        "eventoItems": [],
        "formasParticipacion": []
      },
      "evento": { "id": 123, "codigo": "EV-001", "nombre": "Copa Nacional", "estado": "APROBADO", "disciplina": { "id": 1, "nombre": "Natación" } }
    }
  ],
  "origenes": [
    {
      "id": 5,
      "eventoId": 124,
      "formaParticipacionId": 9,
      "montoCortado": "400.00",
      "totalEventoAntes": "1200.00",
      "totalEventoDespues": "800.00",
      "evento": { "id": 124, "codigo": "EV-002", "nombre": "Torneo Regional" },
      "items": [
        { "itemId": 7, "mes": 7, "montoCortado": "400.00", "item": { "id": 7, "nombre": "Alimentación", "numero": 3 } }
      ]
    }
  ],
  "destinos": [
    {
      "id": 6,
      "eventoId": 123,
      "formaParticipacionId": 3,
      "montoAsignado": "400.00",
      "totalEventoAntes": "0.00",
      "totalEventoDespues": "400.00",
      "evento": { "id": 123, "codigo": "EV-001", "nombre": "Copa Nacional" },
      "items": [
        { "itemId": 7, "mes": 8, "montoAsignado": "400.00", "item": { "id": 7, "nombre": "Alimentación", "numero": 3 } }
      ]
    }
  ],
  "solicitante": { "id": 2, "nombre": "Ana", "apellido": "Pérez", "email": "ana@example.com" },
  "adjuntos": [],
  "createdAt": "2026-07-01T10:00:00.000Z",
  "reviewedAt": null
}
```

Notas:
- `comparacion` (antes/después) vive dentro de cada elemento de `eventos[]`, ya no a nivel raíz.
- En `origenes[]`/`destinos[]`, `items[].montoCortado` / `items[].montoAsignado` es el **monto movido (delta)** de ese ítem/mes, no el total absoluto del ítem tras el movimiento. El total absoluto del evento antes/después de todo el movimiento está en `totalEventoAntes`/`totalEventoDespues` de cada entrada de origen/destino.

### POST `/reforms`

Crea una solicitud de reforma. Body:

```json
{
  "motivo": "Corrección de fechas y traslado de presupuesto",
  "de": "Entrenador",
  "para": "Coordinación",
  "mesEjecucion": 7,
  "eventos": [
    {
      "eventoId": 123,
      "versionBaseId": 456,
      "cambiosPropuestos": {
        "fechaInicio": "2026-05-06T00:00:00.000Z",
        "fechaFin": "2026-05-08T00:00:00.000Z",
        "formasParticipacion": [
          {
            "tipoAval": "FONDOS_PUBLICOS",
            "numEntrenadoresHombres": 0,
            "numEntrenadoresMujeres": 0,
            "numAtletasHombres": 6,
            "numAtletasMujeres": 0,
            "items": [
              { "itemId": 7, "mes": 7, "presupuesto": 400 }
            ]
          }
        ]
      }
    }
  ],
  "eventosOrigen": [
    {
      "eventoId": 124,
      "formaParticipacionId": 9,
      "items": [
        { "itemId": 7, "mes": 7, "monto": 400 }
      ]
    }
  ],
  "eventosDestino": [
    {
      "eventoId": 123,
      "formaParticipacionId": 3,
      "items": [
        { "itemId": 7, "mes": 8, "monto": 400 }
      ]
    }
  ]
}
```

Todos los arrays (`eventos`, `eventosOrigen`, `eventosDestino`) son opcionales de forma individual, pero **al menos uno debe traer datos**: el backend rechaza con `400` si los tres vienen vacíos o ausentes.

En `eventosOrigen[].items[].monto` / `eventosDestino[].items[].monto` se envía el **monto a mover (delta)**, no el total final del ítem.

Campos válidos en `cambiosPropuestos` (por cada entrada de `eventos[]`):
`codigo`, `tipoParticipacion`, `tipoEvento`, `nombre`, `lugar`, `genero`,
`disciplinaId`, `categoriaId`, `provincia`, `ciudad`, `pais`, `alcance`,
`mesProgramado`, `fechaInicio`, `fechaFin`, `cargadoPorExcel`, `formasParticipacion`.

`formasParticipacion` es un array de objetos con:
`tipoAval`, `numEntrenadoresHombres`, `numEntrenadoresMujeres`,
`numAtletasHombres`, `numAtletasMujeres`, `items` (opcional).

NO se envía `formaParticipacionId` ni `tipoAval` suelto ni `eventoItems` a nivel raíz de `cambiosPropuestos`.
`SOLO_RESULTADO` no lleva `items`.

Errores típicos:
- `400`: `eventos`, `eventosOrigen` y `eventosDestino` vienen todos vacíos (`REFORMA_SIN_CAMBIOS`); suma de montos de origen y destino no coincide (`REFORMA_SUM_MISMATCH`); tipos de aval mezclados entre movimientos (`REFORMA_MIXED_TIPO_AVAL`); una misma forma de participación aparece como origen y destino (`REFORMA_ORIGEN_DESTINO_DUPLICADO`).
- `403`: sin permiso para solicitar.
- `404`: algún evento no existe.
- `409`: uno o más eventos ya tienen otra reforma `PENDIENTE` (`REFORMA_EVENTO_BLOQUEADO`).

### PATCH `/reforms/:id/aprobar`

Aprueba y aplica los cambios finales a todos los eventos/movimientos incluidos en la reforma.

Body: opcional. Si se envía, permite overridear los `cambiosPropuestos` de eventos puntuales antes de aplicarlos:

```json
{
  "eventos": [
    { "eventoId": 123, "cambios": { "fechaInicio": "2026-05-07T00:00:00.000Z" } }
  ]
}
```

El frontend actual **no** construye este body de overrides: siempre llama `PATCH /reforms/:id/aprobar` sin body.

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

### GET `/reforms/:id/excel`

Descarga el Excel de la reforma. Solo soportado para reformas de **un solo evento sin movimientos de presupuesto** (`eventos.length === 1 && origenes.length === 0 && destinos.length === 0`); ver `canDownloadReformExcel` en `lib/api/reforms.ts`. Para reformas multi-evento el backend responde `400`.

## Nota (frontend)

El frontend envía:
- Aprobar: `PATCH /reforms/:id/aprobar` sin body (ver `lib/api/reforms.ts`).
- Rechazar: `PATCH /reforms/:id/rechazar` con body `{ observacion }`.
