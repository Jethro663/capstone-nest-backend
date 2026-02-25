-- Drop the manually created roles_name_idx index.
-- The UNIQUE constraint on roles.name already creates an implicit B-tree index
-- (roles_name_unique), making this index redundant. Removing it saves storage
-- and eliminates the extra write-overhead on INSERT/UPDATE to the roles table.
DROP INDEX IF EXISTS "roles_name_idx";
