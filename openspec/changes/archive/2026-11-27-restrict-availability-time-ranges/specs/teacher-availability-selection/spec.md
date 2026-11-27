# Spec Delta

## Purpose

Define las reglas, la visualización en grilla y la validación estricta para el registro de disponibilidad horaria docente en turnos fijos de 4 horas.

## ADDED Requirements

### Requirement: Rangos fijos permitidos de 4 horas
El sistema SHALL restringir la disponibilidad horaria docente únicamente a bloques completos de 4 horas dentro de los rangos `08:00 - 12:00`, `14:00 - 18:00` y `18:00 - 22:00` por cada día habilitado.

#### Scenario: Selección de un bloque dentro de un rango permitido
- **WHEN** un docente selecciona una hora perteneciente a `08:00 - 12:00`, `14:00 - 18:00` o `18:00 - 22:00` y no supera el límite de horas de su régimen
- **THEN** el sistema marca las 4 horas completas del rango correspondiente para ese día

#### Scenario: Deselección de un bloque ya marcado
- **WHEN** un docente hace clic sobre cualquier hora de un bloque de 4 horas ya seleccionado
- **THEN** el sistema desmarca las 4 horas completas de ese bloque en ese día

### Requirement: Franja del mediodía deshabilitada en la grilla
El sistema SHALL mantener la grilla horaria de `08:00` a `22:00` mostrando las horas comprendidas entre `12:00` y `14:00` deshabilitadas visualmente en tono gris y sin permitir interacción.

#### Scenario: Visualización e intento de interacción en franja 12:00 - 14:00
- **WHEN** el docente visualiza la grilla de disponibilidad en escritorio o móvil
- **THEN** las franjas `12:00 - 13:00` y `13:00 - 14:00` aparecen en tono gris deshabilitado y no pueden seleccionarse ni alternarse

### Requirement: Validación estricta en dominio y servidor
El sistema SHALL validar estrictamente en las reglas de negocio y en la persistencia del servidor que únicamente los bloques completos pertenecientes a los rangos `08:00 - 12:00`, `14:00 - 18:00` y `18:00 - 22:00` sean aceptados y contabilizados para el cumplimiento del régimen docente.

#### Scenario: Rechazo de bloques desfasados o fuera de rango en validación
- **WHEN** se evalúan reglas de cumplimiento con horas en `12:00 - 14:00`, bloques desfasados (como `09:00 - 13:00`) o bloques incompletos
- **THEN** dichos horarios no se contabilizan como bloques válidos de 4 horas para el cumplimiento del régimen

#### Scenario: Persistencia estricta de disponibilidad en servidor
- **WHEN** el servidor recibe una solicitud para guardar disponibilidad horaria que incluye horas fuera de los rangos permitidos o bloques incompletos
- **THEN** el servidor rechaza o descarta cualquier horario que no forme un bloque completo válido dentro de `08:00 - 12:00`, `14:00 - 18:00` o `18:00 - 22:00`
