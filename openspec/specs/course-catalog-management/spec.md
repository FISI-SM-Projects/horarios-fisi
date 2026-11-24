# course-catalog-management Specification

## Purpose

Permite la administración y carga masiva de asignaturas del catálogo académico mediante uno o múltiples archivos CSV estructurados, garantizando validación de columnas obligatorias, normalización determinista de identificadores, deduplicación de asignaturas compartidas e inserción idempotente en la base de datos.

## Requirements

### Requirement: Multi-file CSV Ingestion and Column Validation
El sistema SHALL permitir la carga simultánea de uno o varios archivos CSV para poblar el catálogo de cursos, verificando que cada archivo contenga obligatoriamente las columnas: `name`, `school`, `is_thesis`, `code`, `cycle`, `credits`, `course_type` y `curriculum`. Asimismo, el campo `school` SHALL pertenecer al conjunto admitido de escuelas (`EPIS`, `EPISW`, `EPCC`, `EPIA`, `Transversal`) y el nombre (`name`) SHALL ser normalizado a mayúsculas sin tildes ni acentos.

#### Scenario: Valid multi-file CSV upload
- **WHEN** el administrador selecciona múltiples archivos CSV que cumplen con todas las columnas requeridas
- **THEN** el sistema procesa y combina las filas de todos los archivos sin errores de estructura

#### Scenario: Normalization of course name to uppercase without diacritics
- **WHEN** una fila contiene un nombre como `Redacción y Técnicas de Comunicación Efectiva I` o `Cálculo I`
- **THEN** el sistema almacena el nombre normalizado como `REDACCION Y TECNICAS DE COMUNICACION EFECTIVA I` y `CALCULO I`

#### Scenario: Invalid school code in row
- **WHEN** una fila contiene un valor de escuela fuera del catálogo admitido (`EPIS`, `EPISW`, `EPCC`, `EPIA`, `Transversal`)
- **THEN** el sistema rechaza la fila emitiendo una observación de validación indicando la escuela no reconocida

#### Scenario: Missing required column in one of the files
- **WHEN** alguno de los archivos CSV cargados carece de una o más columnas obligatorias
- **THEN** el sistema rechaza el archivo indicando el nombre de la columna faltante y el archivo infractor

#### Scenario: Invalid data type in row
- **WHEN** una fila contiene valores no parseables como booleanos en `is_thesis` o enteros fuera de rango en `cycle` o `credits`
- **THEN** el sistema registra una observación de error especificando el archivo, número de fila y campo inválido

### Requirement: Deterministic Lowercase ID Construction
El sistema SHALL generar el identificador único (`id`) de cada curso combinando la escuela y el código en minúsculas bajo el formato `<school>-<code>` (por ejemplo: `transversal-ino101` o `epis-201230301`).

#### Scenario: Generating standard course ID
- **WHEN** se procesa un curso con escuela `Transversal` y código `INO101`
- **THEN** el sistema genera el identificador canónico `transversal-ino101`

#### Scenario: Normalization of whitespace and diacritics in ID
- **WHEN** la escuela o el código contienen espacios superfluos o caracteres con mayúsculas
- **THEN** el sistema normaliza el texto a minúsculas y produce un identificador alfanumérico coherente sin espacios

### Requirement: Deduplication Across Files and In-Memory Consolidation
El sistema SHALL consolidar las asignaturas provenientes de múltiples archivos CSV, evitando duplicados en memoria cuando un curso transversal o compartido posea el mismo identificador generado.

#### Scenario: Transversal course repeated in multiple school CSVs
- **WHEN** el mismo curso transversal (con idéntico `school` y `code`) aparece tanto en `cursos_epis_2023.csv` como en `cursos_epcc_2023.csv`
- **THEN** el sistema consolida el curso en una única entrada resultante para importación sin reportar conflicto

#### Scenario: Duplicate course with conflicting non-identifying data
- **WHEN** un mismo identificador aparece repetido pero con diferencias no críticas en nombre o créditos
- **THEN** el sistema conserva la última ocurrencia o la versión más completa emitiendo una advertencia de consolidación en el reporte

### Requirement: Pre-Import Validation and Summary Reporting
El sistema SHALL ofrecer una fase de validación previa (dry-run) que genere un reporte detallado indicando el número total de filas leídas, cantidad de cursos nuevos a insertar, cantidad de cursos existentes a actualizar y listado de errores de validación.

#### Scenario: Previewing valid batch before applying
- **WHEN** el usuario ejecuta la acción de validación sobre los archivos seleccionados
- **THEN** el sistema muestra el resumen con el conteo de cursos nuevos, cursos a actualizar y 0 errores, habilitando el botón para aplicar

#### Scenario: Previewing batch with validation errors
- **WHEN** el usuario valida archivos que contienen filas con campos vacíos o tipos inválidos
- **THEN** el sistema muestra el resumen de errores detallando fila y causa, e inhabilita la acción de aplicar hasta corregir las observaciones

### Requirement: Idempotent Database Upsert
El sistema SHALL persistir los cursos validados en la base de datos de manera atómica e idempotente utilizando la clave primaria generada, actualizando los atributos de cursos existentes y registrando el evento de auditoría correspondiente.

#### Scenario: Applying validated import to database
- **WHEN** el usuario confirma la aplicación del lote validado
- **THEN** el sistema ejecuta un `upsert` (`ON CONFLICT (id) DO UPDATE`) en la tabla `courses`, actualiza el catálogo en memoria/vista y registra el evento de auditoría
