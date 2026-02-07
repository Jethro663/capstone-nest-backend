-- Add additional profile fields to users table
ALTER TABLE users
  ADD COLUMN date_of_birth timestamp NULL,
  ADD COLUMN gender text NULL,
  ADD COLUMN civil_status text NULL,
  ADD COLUMN course text NULL,
  ADD COLUMN phone text NULL,
  ADD COLUMN city text NULL,
  ADD COLUMN country text NULL,
  ADD COLUMN family_name text NULL,
  ADD COLUMN family_relationship text NULL,
  ADD COLUMN family_contact text NULL,
  ADD COLUMN profile_picture text NULL;
