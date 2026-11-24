# Tasks

## 1. Limpieza de scripts obsoletos y código muerto

- [x] 1.1 Eliminar scripts de importación legados (`scripts/import-fisi.ts`, `scripts/import-docentes-fisi.ts`, `scripts/import-teacher-courses.ts`) y verificar que ya no existan en el árbol de archivos.
- [x] 1.2 Retirar módulo de dominio obsoleto `src/lib/domain/teacher-course-import.ts` y su archivo de pruebas `src/lib/domain/teacher-course-import.test.ts`.
- [x] 1.3 Eliminar la acción `importTeacherCourses` y tipos asociados en `src/lib/data/schedule-db.ts`, `src/lib/api/schedule-action-runner.ts`, `src/lib/api/schedule-action-types.ts` y `src/app/schedule-actions.ts`.
- [x] 1.4 Limpiar estados, handlers, props y markup de la sección "Carga docente CSV" en `src/components/schedule-app.tsx` y verificar que el proyecto compile sin errores de tipos (`bun run check` o `bunx tsc --noEmit`).

## 2. Dominio de importación de cursos y pruebas unitarias

- [x] 2.1 Actualizar el tipo `SchoolCode` en `src/lib/domain/schedule-data.ts` para incluir `"Transversal"` (`export type SchoolCode = "EPIS" | "EPISW" | "EPCC" | "EPIA" | "Transversal";`) y validar concordancia con `docs/data-model.md`.
- [x] 2.2 Crear el módulo de dominio `src/lib/domain/course-import.ts` con tipado de datos y función de parseo de CSV compatible con múltiples archivos y validación estricta de las 8 columnas requeridas: `name,school,is_thesis,code,cycle,credits,course_type,curriculum`.
- [x] 2.3 Implementar la normalización del nombre del curso a mayúsculas sin tildes (`normalizeCourseName`), la validación de `school` contra `SchoolCode` y la generación determinista de identificador `<school>-<code>` normalizado a minúsculas.
- [x] 2.4 Implementar la consolidación/deduplicación en memoria de cursos que se repiten entre distintos archivos y la función de cálculo de resumen de validación (filas procesadas, cursos consolidados, detección de nuevos vs actualizaciones contra catálogo existente, lista de errores).
- [x] 2.5 Crear `src/lib/domain/course-import.test.ts` con pruebas completas de validación de columnas faltantes, tipos inválidos, normalización de nombres sin tilde, validación de escuela admitida, deduplicación de cursos transversales idénticos e IDs generados, y verificar con `bun test src/lib/domain/course-import.test.ts`.

## 3. Capa de datos, API y Server Actions

- [x] 3.1 Implementar la función `importCourses` en `src/lib/data/schedule-db.ts` que soporte modo dry-run (retorno de resumen y preview) y modo apply (transacción SQL con `insert ... on conflict (id) do update`), registrando auditoría en `schedule_events`.
- [x] 3.2 Añadir la acción `importCourses` a las definiciones de tipos en `src/lib/api/schedule-action-types.ts` y registrar su ejecución en `src/lib/api/schedule-action-runner.ts`.
- [x] 3.3 Exponer la Server Action `runCourseImport` en `src/app/schedule-actions.ts` con revalidación de rutas y control de sesión.

## 4. Interfaz de usuario en Configuración Admin

- [x] 4.1 Diseñar en `ConfigurationView` (`src/components/schedule-app.tsx`) la nueva tarjeta de importación masiva de cursos con input multi-archivo (`multiple`, `.csv`), mostrando la lista y conteo de archivos seleccionados.
- [x] 4.2 Integrar el botón "Validar" y renderizar el reporte resumen destacando: total de filas, cursos nuevos a crear, cursos existentes a actualizar y errores/observaciones si los hubiera.
- [x] 4.3 Integrar el botón "Aplicar" condicionado a una validación exitosa (sin errores), desencadenando la actualización del catálogo y retroalimentación mediante `toast`.

## 5. Verificación integral y validación cruzada

- [x] 5.1 Verificar la importación combinada de los archivos de ejemplo en `docs/csv/` (`cursos_epis_2023.csv`, `cursos_epcc_2023.csv`, `cursos_episw_2023.csv`), comprobando que los cursos transversales (ej. `transversal-ino101`) no se dupliquen.
- [x] 5.2 Ejecutar la suite completa de pruebas unitarias (`bun test`) y validación de TypeScript (`bunx tsc --noEmit`) asegurando 0 regresiones.
