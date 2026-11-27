# Proposal

## Why

Actualmente el sistema permite al docente seleccionar bloques de 4 horas consecutivas empezando desde cualquier hora entre las `08:00` y las `18:00`, incluyendo la franja del mediodía (`12:00 - 14:00`) y bloques desfasados (como `09:00 - 13:00`). Para alinear el registro de disponibilidad con los turnos académicos oficiales de la facultad, es necesario restringir la selección exclusivamente a tres rangos fijos de 4 horas: `08:00 - 12:00`, `14:00 - 18:00` y `18:00 - 22:00`.

## What Changes

- Restringir la selección de disponibilidad horaria docente a bloques completos de 4 horas pertenecientes únicamente a los rangos `8-12` (`08:00 - 12:00`), `14-18` (`14:00 - 18:00`) y `18-22` (`18:00 - 22:00`).
- Mantener la grilla visual hora por hora (`08:00 - 22:00`), deshabilitando con tono gris las horas de `12:00 - 14:00` para impedir su selección.
- Actualizar la interacción de clic en la grilla (escritorio y móvil) para que al hacer clic en cualquier hora dentro de un rango permitido se seleccione o deseleccione el bloque completo de 4 horas correspondiente.
- Aplicar validación estricta tanto en reglas de dominio como en la persistencia del servidor para que solo se acepten y contabilicen bloques completos dentro de los tres rangos permitidos.

## Capabilities

### New Capabilities
- `teacher-availability-selection`: Selección, visualización y validación estricta de disponibilidad horaria docente en bloques fijos de 4 horas dentro de los rangos permitidos (`08:00 - 12:00`, `14:00 - 18:00`, `18:00 - 22:00`).

### Modified Capabilities
<!-- Ninguna capacidad existente cambia sus requisitos -->

## Impact

- **Dominio y validación**: [`src/lib/domain/schedule-data.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-data.ts), [`src/lib/domain/schedule-rules.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.ts) y sus pruebas en [`src/lib/domain/schedule-rules.test.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.test.ts).
- **Persistencia / API**: [`src/lib/data/schedule-db.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.ts) (`normalizeAvailability`, `setAvailability`) y [`src/lib/data/schedule-db.test.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.test.ts).
- **Interfaz de usuario**: [`src/components/schedule-app.tsx`](file:///home/richard/aula-virtual/horarios-fisi/src/components/schedule-app.tsx) (grilla de disponibilidad en escritorio y móvil, `toggleSlot`).
