# Horarios UNMSM

Open-source app for recording teacher availability, validating rules by contract type, and enabling administrative review with PDF/XLSX export.

## Stack

- Next.js 16
- React 19
- Microservicio de Autenticación Institucional (LDAP / av-auth-microservice)
- PostgreSQL 18 (Docker: postgres:18-alpine)
- shadcn/ui
- Tailwind CSS 4
- Bun
- Biome

## Documentation

- [docs/architecture.md](docs/architecture.md) - Overview, layers, authentication flow, naming conventions, and use as a template.
- [docs/data-model.md](docs/data-model.md) - Entity-relationship diagram, table dictionary, and domain invariants.
- [docs/adr/0001-nextjs-fullstack.md](docs/adr/0001-nextjs-fullstack.md) - Why Next.js full-stack instead of a separate backend.
- [docs/adr/0002-postgres-raw-sql.md](docs/adr/0002-postgres-raw-sql.md) - Why raw parameterized SQL instead of an ORM.
- [docs/adr/0004-institutional-ldap-auth.md](docs/adr/0004-institutional-ldap-auth.md) - Institutional LDAP authentication via Next.js BFF.

## Development

1. Levantar el contenedor de PostgreSQL local:

```bash
docker compose up -d postgres
```

2. Configurar `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

3. Inicializar el esquema y catálogo base:

```bash
bun install
bun run db:migrate
bun dev
```

La migración crea el esquema relacional, verifica tablas y restricciones críticas, y siembra el catálogo de cursos. Para incluir docentes de demostración, ejecutar `bun run db:migrate --demo`.

## Quality

```bash
bun run check
```

### Database tests

Las pruebas de integración y caracterización de `src/lib/data/schedule-db.test.ts` se ejecutan localmente contra la base de datos de test en Docker (`horarios_fisi_test`):

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/horarios_fisi_test bun test
```

Sin `TEST_DATABASE_URL`, las pruebas que requieren conexión a base de datos se omiten automáticamente (`describe.skip`) y el resto de la suite continúa en verde.

## On-Premise Deployment (Production)

Para desplegar la aplicación y la base de datos de forma autónoma en servidores locales:

```bash
docker compose up -d --build
```

## Teacher Import

Study plans and the FISI registry do not include a teacher-course matrix. When the Direction office delivers that matrix, it is loaded with a validated CSV:

```csv
teacher_code,teacher_email,course_code,school,position
012345,docente@unmsm.edu.pe,202W0701,Ing. de Sistemas,1
```

Accepted columns for teacher: `teacher_id`, `teacher_code`, `teacher_email`. Accepted columns for course: `course_id`, `course_code`, `school`. If a course code exists in more than one school, the CSV must include `school` or `course_id`.

```bash
bun run db:import:teacher-courses carga-docente.csv
bun run db:import:teacher-courses carga-docente.csv --apply --replace-teachers
```

Without `--apply`, the importer only validates. With `--replace-teachers`, it replaces the load for the teachers included in the file and respects per-contract slot limits.

## Roles

Los roles efectivos se determinan a partir de los roles institucionales asignados en `av-auth-microservice` para el sistema `HORARIOS_FISI` y se sincronizan en `app_users`:

- `docente`: asignado desde el rol institucional `DOCENTE`. Registra su propia disponibilidad y cursos.
- `direccion`: asignado desde `DIRECTOR_ESCUELA` o `DEPARTAMENTO`. Permite la revisión y aprobación de horarios.
- `admin`: asignado desde `ADMIN`. Acceso total a Dirección, Usuarios, Auditoría y Configuración.

Los roles institucionales se administran centralizadamente en el microservicio de autenticación institucional.

## Features

- Autenticación institucional con credenciales LDAP UNMSM (`@unmsm.edu.pe`).
- Sincronización Just-In-Time (JIT) de usuarios y perfiles docentes al iniciar sesión.
- Sesiones cifradas seguras gestionadas por Next.js BFF con renovación proactiva de tokens.
- Registro de disponibilidad docente por bloques horarios.
- Validación de reglas por tipo de contrato (tiempo completo, tiempo parcial 20h y 10h).
- Catálogo de escuelas y cursos editable desde Administración.
- Búsqueda y filtros de cursos por escuela y estado.
- Vista de Dirección para revisión de disponibilidad docente.
- Búsqueda administrativa y filtros por docente, correo y estado.
- Gestión de usuarios y escuelas desde Administración.
- Filtros de usuarios por rol y estado de inducción.
- Cierre y apertura de periodo académico con congelación de disponibilidad.
- Observaciones administrativas e historial de eventos.
- Registro de auditoría institucional con exportación a CSV.
- Exportación de disponibilidad horaria a PDF y Excel.

## License

MIT
