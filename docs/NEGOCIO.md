# Contexto del Negocio

Sistema de gestión de avales deportivos para una federación. Un **aval** es un
expediente digital que respalda la participación de deportistas en eventos.

Antes de crear un aval el entrenador debe adjuntar:

- Certificado médico
- Invitación al evento

## Áreas

**Metodológica**: Entrenador → Metodólogo → DTM
**Administrativa**: Compras Públicas → PDA → Control Previo → Financiero → Contabilidad/Pagaduría

## Tipos de Aval

| Tipo              | Flujo                                                                                               | Presupuesto                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Fondos Públicos   | Entrenador → Compras Públicas → PDA → Metodólogo → DTM → Control Previo → Financiero → Contabilidad | Estatal, ya asignado                                          |
| Fondos Federación | Entrenador → Compras Públicas → PDA → Metodólogo → DTM → Control Previo → Financiero → Contabilidad | Federación, negociable. PDA ajusta sin devolver al entrenador |
| Solo Resultados   | Entrenador → Metodólogo → DTM                                                                       | Sin financiamiento                                            |

**Avales Mixtos**: un aval con financiamiento puede incluir deportistas solo por
resultados en tabla secundaria. El flujo no cambia, no se genera nuevo expediente.

**Rechazos**: cualquier rol puede devolver al rol que cometió el error.
El sistema notifica directamente al destino.

## Roles

| Rol                 | Función                         |
| ------------------- | ------------------------------- |
| SUPER_ADMIN, ADMIN  | Configuración global            |
| SECRETARIA          | Apoyo transversal               |
| DTM                 | Aprobación metodológica final   |
| METODOLOGO          | Revisión técnica por disciplina |
| ENTRENADOR          | Inicia solicitudes de aval      |
| PDA                 | Certifica presupuesto           |
| CONTROL_PREVIO      | Filtro documental               |
| FINANCIERO          | Aprobación económica            |
| COMPRAS_PUBLICAS    | Certifica contratación          |
| DEPORTISTA, USUARIO | Acceso limitado                 |

Un usuario puede tener múltiples roles, disciplinas y categorías.

## Módulos y Rutas

| Ruta              | Propósito                                       |
| ----------------- | ----------------------------------------------- |
| `/avales`         | Creación y seguimiento de expedientes           |
| `/eventos`        | Eventos planificados por disciplina             |
| `/deportistas`    | Deportistas afiliados                           |
| `/usuarios`       | Usuarios y roles                                |
| `/reformas`       | Modificaciones a eventos con trazabilidad       |
| `/cargas-masivas` | Importación de planificación anual desde Excel  |
| `/catalogo`       | Disciplinas, categorías e ítems presupuestarios |
| `/dashboard`      | Resumen por rol                                 |
| `/reportes`       | Reportes y exportaciones                        |
