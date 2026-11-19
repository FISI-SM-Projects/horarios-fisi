# Tasks

## 1. Dependencias e Infraestructura Docker

- [x] 1.1 Remover `@neondatabase/serverless` e instalar `pg` y `@types/pg` en `package.json` usando Bun; verificar instalación limpia con `bun test` o `bun pm ls`.
- [x] 1.2 Crear `docker-compose.yml` configurando el servicio `postgres` con la imagen `postgres:18-alpine`, volumen persistente `postgres_data`, variables de entorno y healthcheck con `pg_isready`; verificar arranque exitoso con `docker compose up -d postgres`.
- [x] 1.3 Crear `Dockerfile` multi-stage optimizado para Next.js con Node 22 Alpine, crear `.dockerignore`, configurar `output: "standalone"` en `next.config.ts` y añadir el servicio `app` en `docker-compose.yml`; verificar sintaxis de build.
- [x] 1.4 Actualizar `.env.example` con la cadena de conexión estándar `postgresql://postgres:postgres@localhost:5432/horarios_fisi` y documentar variables requeridas para Docker.

## 2. Refactorización de la Capa de Datos (Driver y Compatibilidad)

- [x] 2.1 Implementar la gestión de pool de conexiones (`pg.Pool`) con singleton global y adaptar `getSql()` en `src/lib/data/schedule-db.ts` para retornar un cliente con método `query()` que devuelva directamente el arreglo de filas (`T[]`); verificar que `bun run typecheck` no presente errores de tipos en llamadas a `sql.query`.
- [x] 2.2 Implementar el wrapper `sql.transaction()` en `src/lib/data/schedule-db.ts` con manejo de cliente `BEGIN/COMMIT/ROLLBACK` y soporte para tagged template literals `tx```; verificar compilación y funcionamiento en `replaceCourses` y `writeTeacherCourseImport`.
- [x] 2.3 Adaptar los scripts auxiliares en `scripts/` (`migrate.ts`, `import-docentes-fisi.ts`, `import-fisi.ts`, `import-teacher-courses.ts`, `verify-production.ts`) para eliminar la importación de `neon` y utilizar el nuevo cliente PostgreSQL; verificar con `bun run typecheck`.

## 3. Pruebas Locales y Verificación

- [x] 3.1 Actualizar `src/lib/data/test-helpers.ts` y `src/lib/data/schedule-db.test.ts` eliminando referencias al tipo `NeonQueryFunction` y habilitando la ejecución autónoma contra una base de datos local de test; verificar ejecución con `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/horarios_fisi_test bun test`.
- [x] 3.2 Ejecutar `bun run db:migrate` contra la base de datos local en Docker y verificar que la inicialización del esquema y la verificación de tablas/restricciones sean exitosas (`ready: true`).
- [x] 3.3 Construir la imagen de producción con `docker compose build app` y validar que el contenedor inicie y se conecte a la base de datos en la red interna de Docker.

## 4. Documentación de Arquitectura

- [x] 4.1 Actualizar `docs/adr/0002-postgres-raw-sql.md`, `docs/architecture.md` y `README.md` reflejando el reemplazo de Neon Cloud por PostgreSQL 18 local (Docker Alpine) e instrucciones de despliegue on-premise.

