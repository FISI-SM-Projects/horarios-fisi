# Design

## Context

El registro de disponibilidad docente se apoya en tres capas que actualmente asumen bloques deslizantes de 4 horas sobre `hours = [8..21]`:
- Definición de horas y datos semilla en [`src/lib/domain/schedule-data.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-data.ts).
- Validación de reglas por contrato en [`src/lib/domain/schedule-rules.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.ts), donde `countFourHourBlocks` acepta cualquier racha contigua de 4 horas.
- Persistencia en [`src/lib/data/schedule-db.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.ts), donde `normalizeAvailability` solo filtra por día y hora válida (`8..21`).
- Interfaz de grilla (escritorio y móvil) en [`src/components/schedule-app.tsx`](file:///home/richard/aula-virtual/horarios-fisi/src/components/schedule-app.tsx), donde `toggleSlot` toma 4 horas consecutivas desde la hora clickeada.

Ver `proposal.md` para la motivación y `specs/teacher-availability-selection/spec.md` para los requisitos observables.

## Goals / Non-Goals

**Goals:**
- Centralizar la definición de los 3 rangos fijos permitidos (`[8,9,10,11]`, `[14,15,16,17]`, `[18,19,20,21]`) en el dominio para evitar duplicación entre UI, reglas y persistencia.
- Mantener la grilla de 14 filas (`08:00 - 22:00`) con `12:00 - 14:00` deshabilitado en gris y selección/deselección por bloque fijo al hacer clic en cualquier hora del rango.
- Garantizar validación estricta en reglas de dominio y al persistir en servidor.

**Non-Goals:**
- Cambiar la estructura de tablas de PostgreSQL (`teacher_availability`, `teacher_sandbox_availability`), que siguen almacenando filas por hora individual.
- Migrar o limpiar datos históricos en base de datos (producción está en pausa y no existen rangos desfasados).
- Modificar las reglas de cantidad de horas o días requeridos por tipo de contrato (`full`: 40h, `partial20`: 20h, `partial10`: 12h).

## Decisions

### 1. Catálogo canónico de bloques en el dominio
Se definirá una constante y helper en [`src/lib/domain/schedule-data.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-data.ts) con los 3 rangos fijos (`[8, 9, 10, 11]`, `[14, 15, 16, 17]`, `[18, 19, 20, 21]`) y una función para obtener el bloque correspondiente a una hora dada (`null` para `12` y `13`).
- **Alternativa considerada**: Duplicar rangos o condiciones `if/else` en UI, reglas y DB. Se descarta porque facilita divergencias entre cliente y servidor.

### 2. Interacción y renderizado en la grilla
En [`src/components/schedule-app.tsx`](file:///home/richard/aula-virtual/horarios-fisi/src/components/schedule-app.tsx):
- `toggleSlot` resolverá el bloque fijo al que pertenece `hour`. Si `hour` no pertenece a ningún rango permitido (`12` o `13`), retornará sin cambios. Al seleccionar o deseleccionar, agregará o quitará exactamente las 4 horas de ese rango fijo, validando únicamente que no se supere `rule.requiredHours` (el solapamiento parcial ya no puede ocurrir entre rangos disjuntos).
- En la vista de escritorio y móvil, las filas/celdas de `12:00 - 13:00` y `13:00 - 14:00` se renderizarán como no interactivas con estilo gris deshabilitado (`bg-muted/40 text-muted-foreground cursor-not-allowed`). Todas las horas dentro de `8-12`, `14-18` y `18-22` serán clickeables cuando la grilla sea interactiva.
- **Alternativa considerada**: Reducir la grilla a 3 filas de turnos. Descartada por requerimiento explícito de mantener la grilla horaria con la franja `12-14` visible en tono gris.

### 3. Validación estricta en reglas y servidor
- En [`src/lib/domain/schedule-rules.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-rules.ts), `countFourHourBlocks` (y el conteo de horas válidas si aplica) verificará cuántos de los 3 rangos fijos están completos (las 4 horas presentes) para cada día, ignorando cualquier hora fuera de rango o bloque incompleto/desfasado.
- En [`src/lib/data/schedule-db.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/data/schedule-db.ts), `setAvailability` / `normalizeAvailability` validará estrictamente que los slots enviados por día correspondan únicamente a bloques completos de los 3 rangos permitidos (rechazando con error `400` o filtrando estrictamente según el contrato de errores de `ScheduleError`).

## Risks / Trade-offs

- **[Datos semilla existentes]** → En `seedTeachers` de [`src/lib/domain/schedule-data.ts`](file:///home/richard/aula-virtual/horarios-fisi/src/lib/domain/schedule-data.ts#L248-L252), `carlos-ramos` tiene `viernes: [14, 15, 16]` (3 horas). Si se usa en pruebas o vista previa, no contará como bloque completo de 4 horas hasta completarlo o ajustarlo; se revisará en las pruebas existentes.
- **[Rechazo estricto en API vs. clientes desactualizados]** → Si un cliente enviara slots inválidos, la validación estricta en servidor impedirá guardar datos inconsistentes; la UI actualizada solo enviará bloques válidos.
