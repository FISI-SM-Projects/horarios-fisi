# Proposal

## Why

Actualmente, el sistema Horarios FISI depende de la plataforma externa en la nube Neon para la persistencia relacional PostgreSQL mediante el cliente `@neondatabase/serverless` (protocolo propietario HTTP/WebSocket), lo cual impide operar en entornos completamente on-premise, genera dependencia de conectividad a internet y complica la ejecución de pruebas locales automatizadas. Esta migración traslada la base de datos a un PostgreSQL local v18 (`postgres:18-alpine`) contenerizado con Docker, desacoplando el sistema de servicios externos e independizando la infraestructura del proyecto.

## What Changes

- **Reemplazo del driver de base de datos**: Se elimina la dependencia de `@neondatabase/serverless` y se adopta el cliente PostgreSQL nativo (`pg` y `@types/pg`) con administración de pool de conexiones (`pg.Pool`) y soporte transaccional estándar.
- **Capa de compatibilidad de persistencia**: Se implementa un adaptador/cliente centralizado en `src/lib/data/` para preservar las interfaces de consulta (`sql.query` retornando arreglos de filas) y transacciones batch sin requerir reescrituras disruptivas en las consultas existentes.
- **Contenerización On-Premise (Docker)**:
  - Definición de `docker-compose.yml` para levantar PostgreSQL 18 Alpine (`postgres:18-alpine`) con volumen de almacenamiento persistente (`pgdata`) y healthcheck activo para desarrollo y producción.
  - Creación de `Dockerfile` multi-stage optimizado para producción (`output: "standalone"` en Next.js), permitiendo desplegar la aplicación completa on-premise.
- **Independencia en pruebas y scripts**:
  - Actualización de `src/lib/data/schedule-db.test.ts` y `test-helpers.ts` para ejecutar pruebas locales aisladas contra una base de datos local (`TEST_DATABASE_URL`), eliminando la necesidad de ramas efímeras en Neon (`neonctl`).
  - Actualización de scripts de migración e importación (`migrate.ts`, `import-*.ts`, `verify-production.ts`) para usar el cliente PostgreSQL estándar.
- **Documentación de arquitectura**: Actualización de `docs/adr/0002-postgres-raw-sql.md`, `README.md` y variables de entorno en `.env.example`.

## Capabilities

### New Capabilities
- `local-database-persistence`: Proporciona persistencia relacional local mediante PostgreSQL v18 sobre protocolo TCP estándar, gestión de pool de conexiones, soporte transaccional y ejecución de pruebas de base de datos sin dependencias de servicios en la nube.

### Modified Capabilities
<!-- No se modifican requisitos funcionales de capacidades existentes como institutional-auth. -->

## Impact

- **Dependencias**: Se remueve `@neondatabase/serverless` y se añaden `pg` y `@types/pg` en `package.json`.
- **Código de datos**: `src/lib/data/schedule-db.ts`, `src/lib/data/schedule-db.test.ts`, `src/lib/data/test-helpers.ts`.
- **Scripts**: `scripts/migrate.ts`, `scripts/import-docentes-fisi.ts`, `scripts/import-fisi.ts`, `scripts/import-teacher-courses.ts`, `scripts/verify-production.ts`.
- **Configuración y Build**: `next.config.ts` (standalone), `.env.example`, `docker-compose.yml`, `Dockerfile`, `.dockerignore`.
- **Infraestructura**: Despliegue on-premise autónomo con Docker.
