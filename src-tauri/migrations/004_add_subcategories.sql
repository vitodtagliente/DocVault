-- Allow categories to be nested one level deep (parent → child).
-- parent_id NULL means top-level category.
ALTER TABLE categories ADD COLUMN parent_id TEXT REFERENCES categories(id);
