# Tasks

## 1. Dominio y Reglas de Validación

- [x] 1.1 Definir los 3 rangos fijos permitidos (`[8,9,10,11]`, `[14,15,16,17]`, `[18,19,20,21]`) y helper de resolución de bloque en [`src/lib/domain/schedule-data.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-data.ts), verificando que `12` y `13` devuelvan `null` y que `tsc --noEmit` pase sin errores.
- [x] 1.2 Actualizar `countFourHourBlocks` y `validateTeacherRules` en [`src/lib/domain/schedule-rules.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.ts) para contabilizar únicamente bloques completos dentro de los 3 rangos permitidos, agregando pruebas unitarias en [`src/lib/domain/schedule-rules.test.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.test.ts) que cubran rechazo de `12-14`, bloques desfasados (ej. `9-13`) y bloques incompletos, y verificar que `bun test src/lib/domain/schedule-rules.test.ts` pase.

## 2. Persistencia y Validación en Servidor

- [x] 2.1 Actualizar `normalizeAvailability` y `setAvailability` en [`src/lib/data/schedule-db.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.ts) para validar estrictamente que solo se persistan bloques completos dentro de `8-12`, `14-18` y `18-22`, rechazando o descartando cualquier slot fuera de rango o incompleto, y agregar pruebas en [`src/lib/data/schedule-db.test.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.test.ts) verificando que `bun test src/lib/data/schedule-db.test.ts` pase.

## 3. Interfaz de Grilla Horaria

- [x] 3.1 Actualizar `toggleSlot` en [`src/components/schedule-app.tsx`](file:///home/richard/aula-virtual/horarios-fisi/src/components/schedule-app.tsx) para seleccionar o deseleccionar el bloque completo de 4 horas correspondiente al rango permitido de la hora clickeada, ignorando `12` y `13`, y verificando el límite de horas del contrato.
- [x] 3.2 Actualizar el renderizado de la grilla en escritorio y móvil en [`src/components/schedule-app.tsx`](file:///home/richard/aula-virtual/horarios-fisi/src/components/schedule-app.tsx) para mostrar las filas/celdas de `12:00 - 14:00` (`12` y `13`) deshabilitadas con tono gris (`cursor-not-allowed`) y habilitar el clic en cualquier hora de los rangos `8-12`, `14-18` y `18-22`, verificando con `bun run build` o `bunx tsc --noEmit`.

## 4. Verificación Integral

- [x] 4.1 Ejecutar la suite de pruebas y verificación de tipos (`bun test` y `bunx tsc --noEmit`) para confirmar que toda la aplicación compila y pasa sin regresiones.
