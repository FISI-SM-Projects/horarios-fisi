# Design

## Context

El sistema cuenta con un catálogo de asignaturas en PostgreSQL (`courses`) y componentes en React para su visualización y filtrado. Hasta ahora, la única forma de poblar el catálogo era mediante scripts antiguos basados en Excel/PDF o inserción unitaria manual. Asimismo, la pantalla de configuración exponía un componente de "Carga docente CSV" destinado a asociar docentes con cursos (`teacher_courses`), el cual ha quedado obsoleto y genera confusión institucional. Ver `proposal.md` para el contexto y motivación general.

## Goals / Non-Goals

**Goals:**
- Proveer una interfaz administrativa para cargar masivamente cursos a partir de uno o múltiples archivos CSV con el formato canónico de la FISI (`docs/csv`).
- Generar identificadores primarios deterministas normalizados a minúsculas: `<school>-<code>`.
- Deduplicar en memoria asignaturas comunes (especialmente cursos transversales compartidos entre planes de EPIS, EPISW, EPCC, etc.) sin arrojar colisiones de clave primaria.
- Proporcionar retroalimentación en dos etapas (validación previa con resumen estadístico y aplicación definitiva con actualización de vista).
- Eliminar de raíz los scripts de importación obsoletos y el código muerto backend/frontend de `teacher-course-import`.

**Non-Goals:**
- No se implementa importación de docentes (`teacher_profiles`) ni de horarios de disponibilidad docente en este cambio.
- No se modificará el esquema DDL de la tabla `courses` en la base de datos (las columnas `id, code, name, school, active, cycle, credits, course_type, curriculum, is_thesis` ya existen y son suficientes).

## Decisions

### 1. Manejo multi-archivo en el cliente y servidor
- **Decisión**: El componente de interfaz (`ConfigurationView`) permitirá seleccionar múltiples archivos (`<input type="file" multiple accept=".csv,text/csv">`). En el frontend se leerá el contenido textual de cada archivo seleccionado y se enviará un arreglo estructurado `{ filename: string, content: string }[]` hacia la Server Action.
- **Alternativas consideradas**:
  - *Subida individual (un archivo a la vez)*: Obligaría al usuario a repetir el proceso 4 o 5 veces por cada escuela profesional y dificultaría la deduplicación cruzada previa a la persistencia.
  - *Procesar multipart/form-data en un Route Handler dedicado*: Se prefiere mantener la coherencia con el patrón existente de `schedule-actions.ts` mediante Server Actions autenticadas y serializables en JSON.

### 2. Generación determinista del ID, Validación de Escuela y Normalización de Nombre
- **Ampliación de `SchoolCode`**:
  Se actualiza el tipo en `src/lib/domain/schedule-data.ts`:
  ```ts
  export type SchoolCode = "EPIS" | "EPISW" | "EPCC" | "EPIA" | "Transversal";
  ```
  Esto alinea el código con `docs/data-model.md` y permite validar que cada fila pertenezca a una escuela oficial o al ámbito `Transversal`.
- **Normalización de nombre (`name`)**:
  Para eliminar inconsistencias ortográficas entre archivos, el nombre se limpia a mayúsculas y sin acentos ni diacríticos:
  ```ts
  function normalizeCourseName(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }
  ```
- **Construcción de ID**:
  ```ts
  function buildCourseId(school: string, code: string): string {
    const cleanSchool = slug(school);
    const cleanCode = slug(code);
    return `${cleanSchool}-${cleanCode}`.toLowerCase();
  }
  ```
  Donde `slug` elimina acentos, caracteres especiales y convierte espacios en guiones.
- **Deduplicación**:
  - En memoria: se utiliza un `Map<string, ValidatedCourse>` acumulando filas de todos los archivos procesados. Si un ID ya fue ingresado (ej. curso `Transversal-INO101` presente tanto en `cursos_epis_2023.csv` como en `cursos_epcc_2023.csv`), se ignora la duplicación emitiendo un conteo consolidado.
  - En base de datos: se comparan los IDs resultantes contra los existentes en la tabla `courses` para calcular métricas exactas:
    - `newCoursesCount`: IDs no encontrados en la BD.
    - `updatedCoursesCount`: IDs ya existentes en la BD.
  - Inserción SQL:
    ```sql
    insert into courses (id, code, name, school, active, is_thesis, cycle, credits, course_type, curriculum)
    values ($1, $2, $3, $4, true, $5, $6, $7, $8, $9)
    on conflict (id) do update set
      code = excluded.code,
      name = excluded.name,
      school = excluded.school,
      active = true,
      is_thesis = excluded.is_thesis,
      cycle = excluded.cycle,
      credits = excluded.credits,
      course_type = excluded.course_type,
      curriculum = excluded.curriculum
    ```

### 3. Capa de Dominio Desacoplada (`src/lib/domain/course-import.ts`)
- **Decisión**: Concentrar las reglas de parseo de CSV (RFC 4180 tolerante con comillas y saltos de línea), validación de encabezados requeridos, coerción de tipos (números enteros de ciclos 1-10, créditos positivos, booleanos `true`/`false`) en funciones puras en `src/lib/domain/course-import.ts`, acompañadas de su propia suite de pruebas en Bun (`course-import.test.ts`).

### 4. Limpieza exhaustiva de código muerto
- **Decisión**: Borrar físicamente los scripts en `scripts/`, eliminar `teacher-course-import.ts` y su test, y retirar la rama `importTeacherCourses` del runner y de `schedule-db.ts`.
- **Razón**: El requerimiento explícito del usuario es no dejar código muerto, asegurando que la base de código permanezca limpia y sin endpoints zombis.

## Risks / Trade-offs

- **[Riesgo] Discrepancia en nombres de materias transversales entre archivos de distintas escuelas**: Por ejemplo, un archivo podría tener una tilde omitida o una palabra abreviada.
  - *Mitigación*: La clave primaria canónica es `<school>-<code>` (ej. `transversal-ino101`). Si el código y la escuela coinciden, el sistema los considera la misma entidad curricular y preserva una versión uniforme, emitiendo una advertencia si hay divergencia en el nombre.
- **[Riesgo] Archivos CSV con codificación UTF-8 con BOM o delimitadores Windows CRLF**:
  - *Mitigación*: El parser normaliza encabezados removiendo caracteres BOM (`\uFEFF`), limpia espacios en blanco y maneja delimitadores universales `\r?\n`.
