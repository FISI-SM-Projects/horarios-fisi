# ADR 0002: Local Postgres with raw parameterized SQL

## Context

The application requires relational persistence for an autonomous, on-premise deployment without external cloud dependencies. The options evaluated were an ORM (Drizzle, Prisma), proprietary serverless cloud drivers, and raw SQL over standard `pg` (`node-postgres`).

## Decision

Local PostgreSQL v18 (`postgres:18-alpine` managed via Docker) is used with `pg` (`node-postgres`), connection pooling (`pg.Pool`), and parameterized SQL directly in `src/lib/data/schedule-db.ts`. There is no ORM and no external cloud database dependency.

## Consequences

- SQL is visible and auditable: every query can be read without translating an ORM DSL. This is relevant in an academic context where code transparency has didactic value.
- Infrastructure is self-contained: the database runs locally in Docker, communicating over standard TCP protocol (`5432`), eliminating internet dependency and external platform latency.
- Connection pooling: managed via a global singleton `pg.Pool` to prevent socket exhaustion during Next.js development with Fast Refresh.
- The schema lives in `ensureScheduleSchema()` as `CREATE TABLE IF NOT EXISTS` statements. It is executable on each application start, which simplifies initial deployment and local testing.
- Automated tests: can run 100% offline against a dedicated local test database (`horarios_fisi_test`) without provisioning cloud branches.
- Data access is encapsulated in `src/lib/data/schedule-db.ts`; if an ORM is adopted in the future, the change remains contained within that module.
