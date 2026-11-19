# Design

## Context

El sistema utilizaba `@neondatabase/serverless` para interactuar con bases de datos en Neon Cloud mediante peticiones HTTP. La base de datos contiene 10 tablas principales con esquema administrado mediante DDL en `ensureScheduleSchema()` y consultas parametrizadas directamente en `src/lib/data/schedule-db.ts` sin ORM (ADR 0002).

Para operar 100% on-premise, se requiere ejecutar PostgreSQL localmente sobre TCP estándar, orquestado con Docker y con capacidad de desplegar tanto la aplicación web en producción como el servicio de base de datos de manera autónoma.

## Goals / Non-Goals

**Goals:**
- Reemplazar `@neondatabase/serverless` por `pg` (`node-postgres`) utilizando conexión TCP y connection pooling (`pg.Pool`).
- Mantener una capa de compatibilidad transparente en `getSql()` que conserve las firmas de `sql.query` (retorno directo de arreglos) y `sql.transaction` (ejecución atómica en bloque) para evitar refactorizar más de un centenar de consultas existentes.
- Proporcionar configuración Docker con `postgres:18-alpine`:
  - En desarrollo: Ejecutar únicamente el contenedor de base de datos (`docker compose up -d postgres`), permitiendo iterar con `bun dev` localmente.
  - En producción: Orquestar el contenedor de la aplicación web y el contenedor de base de datos mediante Docker Compose.
- Crear un `Dockerfile` multi-stage optimizado para Next.js en modo `standalone`.
- Habilitar la ejecución local y offline de las pruebas de integración (`schedule-db.test.ts`) apuntando a una base de datos local de test.

**Non-Goals:**
- No se migrarán ni preservarán datos históricos desde Neon Cloud (arranque limpio con scripts de migración y seed).
- No se alterará el sistema de autenticación actual (el reemplazo de auth por Keycloak queda explícitamente para una fase posterior).
- No se adoptará un ORM (Prisma/Drizzle); se mantiene la decisión de diseño de SQL parametrizado nativo de ADR 0002.

## Decisions

### 1. Adopción de `pg` (`node-postgres`) con Wrapper de Compatibilidad
- **Decisión**: Utilizar `pg` y `@types/pg` en lugar de drivers alternativos como `postgres.js` o clientes HTTP.
- **Razón**: `pg` es el estándar en el ecosistema Node/Next.js para conexiones TCP Postgres con pooling maduro. Para evitar modificar 103 consultas en `schedule-db.ts` que esperan `result` como arreglo directo (`T[]`), implementamos un wrapper sobre `pool.query` que extrae `result.rows`.
- **Alternativas consideradas**:
  - `postgres` (porsager): Muy rápido y moderno, pero requiere cambiar la sintaxis a tagged templates (`sql`...``) y modificar la llamada de parámetros en todo el archivo de base de datos.
  - Reescritura a ORM: Descartado por el ADR 0002 para mantener transparencia didáctica del SQL.

### 2. Gestión del Pool de Conexiones (Singleton Global)
- **Decisión**: Instanciar `pg.Pool` como singleton en `globalThis` en entornos de desarrollo (`NODE_ENV !== 'production'`).
- **Razón**: El Fast Refresh de Next.js reinicia módulos en memoria frecuentemente, lo cual crearía múltiples pools concurrentes y agotaría los sockets de PostgreSQL en el contenedor.
- **Alternativas consideradas**: Instanciar un cliente en cada petición (ineficiente y causa agotamiento de conexiones).

### 3. Emulación Transaccional para Consultas en Lote
- **Decisión**: Implementar `sql.transaction(callback)` adquiriendo un cliente dedicado de `pg.Pool`, ejecutando `BEGIN`, procesando las sentencias (incluyendo soporte de tagged template literal `tx```) y cerrando con `COMMIT` (o `ROLLBACK` en caso de error) dentro de un bloque `try/finally` que libera el cliente.
- **Razón**: `replaceCourses` y `writeTeacherCourseImport` dependen de `sql.transaction((tx) => [ ... ])` para garantizar consistencia atómica sin dejar asignaciones a medias.

### 4. Orquestación Docker: Entorno Dual (Dev vs Prod)
- **Decisión**:
  - `docker-compose.yml` define el servicio `postgres` con la imagen oficial `postgres:18-alpine`, volumen persistente `postgres_data` y healthcheck con `pg_isready`.
  - El servicio `app` se configura para producción utilizando un build multi-stage (`Dockerfile`), con dependencia condicional `depends_on: postgres: condition: service_healthy`.
  - Para desarrollo, se levanta únicamente Postgres (`docker compose up -d postgres`) y el host corre la app vía `bun dev`.
- **Alternativas consideradas**: Contenedores separados por archivos compose distintos; se prefirió un único `docker-compose.yml` con servicios bien definidos para simplificar la administración on-premise.

### 5. Compilación Standalone de Next.js para Contenedor
- **Decisión**: Configurar `output: "standalone"` en `next.config.ts` y estructurar el `Dockerfile` en tres etapas:
  1. `deps`: Instalación de dependencias con Bun.
  2. `builder`: Compilación de la aplicación con `next build`.
  3. `runner`: Imagen ligera `node:22-alpine` que ejecuta `node server.js` copiando únicamente los artefactos mínimos necesarios (`.next/standalone`, `.next/static` y `public`).
- **Razón**: Reduce el tamaño de la imagen final de producción de ~1.5 GB a menos de 200 MB y asegura compatibilidad con Node 22.

## Risks / Trade-offs

- **[Riesgo] Agotamiento de conexiones en desarrollo con Next.js Fast Refresh** → *Mitigación*: Implementación estricta de singleton global para `pg.Pool`.
- **[Riesgo] Discrepancia de comportamiento entre el cliente HTTP anterior y TCP en transacciones** → *Mitigación*: Ejecución de la suite completa de pruebas unitarias y de caracterización (`schedule-db.test.ts`) contra el contenedor local antes de dar por completado el cambio.
- **[Riesgo] Bloqueo en Docker Compose si la base de datos tarda en iniciar** → *Mitigación*: Inclusión de `healthcheck` (`pg_isready -U postgres`) y `condition: service_healthy` en la relación de dependencia del contenedor de aplicación.

## Migration Plan

1. **Dependencias**:
   - `bun remove @neondatabase/serverless`
   - `bun add pg && bun add -d @types/pg`
2. **Infraestructura**:
   - Crear `docker-compose.yml`, `Dockerfile`, `.dockerignore`.
   - Modificar `next.config.ts` (`output: 'standalone'`).
3. **Capa de Datos**:
   - Refactorizar `getSql()` en `src/lib/data/schedule-db.ts` con `pg.Pool` y wrapper de compatibilidad.
   - Actualizar `src/lib/data/schedule-db.test.ts` y `test-helpers.ts` para pruebas locales.
   - Actualizar scripts en `scripts/*.ts`.
4. **Verificación y Pruebas**:
   - Levantar `postgres:18-alpine` con `docker compose up -d postgres`.
   - Ejecutar `bun run db:migrate`.
   - Ejecutar `bun run test` (suite de pruebas completa en local).
   - Validar build de contenedor de producción `docker compose build app`.
