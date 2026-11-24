# Proposal

## Why

Actualmente, el sistema cuenta con scripts legados frágiles y código muerto para la importación de asignaciones docentes (`teacher-courses`), mientras que la configuración del catálogo de cursos carece de una herramienta masiva y amigable desde la interfaz de administración. Para desplegar y gestionar planes de estudio completos (como los de EPIS, EPISW, EPCC y cursos Transversales) de forma ágil y segura, se requiere una funcionalidad de carga masiva de cursos mediante uno o varios archivos CSV con validación estricta, reporte resumen y prevención de colisiones por ID compuesto normalizado.

## What Changes

- **Limpieza de código obsoleto y scripts legados**:
  - Eliminación de scripts CLI obsoletos: `scripts/import-fisi.ts`, `scripts/import-docentes-fisi.ts` y `scripts/import-teacher-courses.ts`.
  - Eliminación de la sección "Carga docente CSV" en la vista de configuración de administrador (`src/components/schedule-app.tsx`).
  - Retiro completo de código muerto asociado a la importación de asignaciones docente-curso: `src/lib/domain/teacher-course-import.ts`, `src/lib/domain/teacher-course-import.test.ts`, acción `importTeacherCourses` en el runner y capa de base de datos.
- **Nueva funcionalidad de carga masiva de cursos (CSV)**:
  - Soporte para subir uno o múltiples archivos CSV desde la vista de configuración institucional.
  - Validación de campos obligatorios en cada fila: `name`, `school`, `is_thesis`, `code`, `cycle`, `credits`, `course_type`, `curriculum`.
  - Construcción de `id` canónico para cada curso con la regla `<school>-<code>` normalizado a minúsculas (ejemplo: `transversal-ino101`).
  - **Deduplicación**:
    - Deduplicación en memoria ante cursos compartidos (como cursos transversales presentes en múltiples CSVs de distintas escuelas).
    - Upsert idempotente en base de datos (`insert ... on conflict (id) do update`).
  - **Reporte resumen**:
    - Previsualización y validación antes de aplicar: desglose de filas totales, cursos nuevos por insertar, cursos existentes a actualizar y listado de errores de validación.
  - Actualización inmediata del catálogo visual tras aplicar la importación.

## Capabilities

### New Capabilities
- `course-catalog-management`: Gestión y carga masiva del catálogo de cursos mediante archivos CSV tabulares, incluyendo parsing tolerante, validación estructural, deduplicación de asignaturas compartidas, generación determinista de identificadores y persistencia en base de datos.

### Modified Capabilities
<!-- No requirement changes to existing capabilities -->

## Impact

- **Frontend**: `src/components/schedule-app.tsx` reemplaza la sección de carga docente por la nueva sección de importación de cursos con soporte multi-archivo y reporte interactivo.
- **Dominio**: Nuevo módulo `src/lib/domain/course-import.ts` y suite de pruebas `src/lib/domain/course-import.test.ts`. Eliminación de `teacher-course-import.ts`.
- **API y Server Actions**: Nuevo tipo de acción `importCourses` en `src/lib/api/schedule-action-types.ts`, `src/lib/api/schedule-action-runner.ts` y `src/app/schedule-actions.ts`.
- **Base de Datos**: Método `importCourses` en `src/lib/data/schedule-db.ts` con transacción atómica y auditoría `catalog.courses_imported`.
- **Scripts**: Limpieza de scripts en `scripts/`.
