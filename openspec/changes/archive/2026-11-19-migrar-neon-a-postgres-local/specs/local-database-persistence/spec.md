# Spec Delta

## Purpose

Proporciona persistencia relacional local mediante PostgreSQL v18 (Alpine en contenedor Docker) operado sobre protocolo TCP estándar, asegurando ciclo de vida transaccional, esquema idempotente y pruebas de base de datos offline sin dependencias de servicios externos en la nube.

## ADDED Requirements

### Requirement: Local PostgreSQL Connection and Pooling
El sistema SHALL conectarse a una instancia PostgreSQL local mediante protocolo TCP estándar utilizando un pool de conexiones administrado, prescindiendo de proxies HTTP propietarios o servicios externos en la nube.

#### Scenario: Successful connection to local PostgreSQL
- **WHEN** el servidor o un script inicia con una variable `DATABASE_URL` válida apuntando al PostgreSQL local
- **THEN** el sistema establece la conexión exitosamente a través del pool de conexiones sin contactar servicios externos

#### Scenario: Connection failure on unavailable database
- **WHEN** la instancia local de PostgreSQL no está disponible o las credenciales son incorrectas
- **THEN** el sistema lanza un error explícito de conexión indicando la falta de disponibilidad de la base de datos local

### Requirement: Idempotent Schema and Migration Execution
El sistema SHALL verificar, inicializar y actualizar el esquema relacional de tablas, restricciones y extensiones de forma idempotente sobre PostgreSQL local.

#### Scenario: First-time schema initialization
- **WHEN** se ejecuta la inicialización del esquema en una base de datos local vacía
- **THEN** el sistema crea todas las tablas, índices, secuencias y restricciones requeridas sin errores

#### Scenario: Subsequent schema verification
- **WHEN** se ejecuta la inicialización sobre una base de datos que ya posee el esquema completo
- **THEN** el sistema verifica la estructura existente sin duplicar objetos ni corromper datos

### Requirement: Transactional Batch Operations
El sistema SHALL ejecutar operaciones multiconsulta atómicas (como el reemplazo de asignaciones docentes o cursos) dentro de una transacción que garantice atomicidad completa o reversión en caso de error.

#### Scenario: Successful atomic batch execution
- **WHEN** se ejecuta una operación compuesta de múltiples sentencias SQL dentro de un bloque transaccional
- **THEN** todas las operaciones se confirman atómicamente en la base de datos local

#### Scenario: Automatic rollback on query failure
- **WHEN** una de las sentencias dentro de la transacción falla por violación de restricción o error de sintaxis
- **THEN** el sistema revierte todos los cambios previos del bloque y propaga el error sin dejar datos inconsistentes

### Requirement: Autonomous Offline Database Testing
La suite de pruebas SHALL poder ejecutarse contra una base de datos local aislada sin requerir ramas efímeras en la nube ni conexión a internet.

#### Scenario: Database tests run against local test instance
- **WHEN** se proporciona una variable `TEST_DATABASE_URL` apuntando a una base de datos local de pruebas y se ejecuta la suite de tests
- **THEN** la suite ejecuta todas las pruebas de integración contra la instancia local y limpia el estado entre suites
