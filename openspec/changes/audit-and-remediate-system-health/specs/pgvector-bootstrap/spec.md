## ADDED Requirements

### Requirement: Idempotent pgvector bootstrap
The migration runner SHALL enable pgvector with `CREATE EXTENSION IF NOT EXISTS vector;` before applying a baseline that uses the `vector` type, and the database migration history SHALL include the same idempotent operation in a new forward migration.

#### Scenario: Fresh database migration
- **WHEN** migrations run against a fresh database with the pgvector extension available
- **THEN** the `vector` extension is installed and `content_chunk_embeddings.embedding` is available as `vector(768)`.

#### Scenario: Migration is repeated
- **WHEN** the migration process is run again against the same database
- **THEN** it completes without attempting a destructive schema rewrite or failing because pgvector already exists.

### Requirement: Fatal undefined migration dependencies
The migration runner SHALL fail without recording a migration when PostgreSQL reports an undefined type or object dependency.

#### Scenario: Vector type is unavailable
- **WHEN** a baseline statement requires `vector(768)` and pgvector cannot be enabled
- **THEN** the runner exits with an error and does not mark that migration as applied.
