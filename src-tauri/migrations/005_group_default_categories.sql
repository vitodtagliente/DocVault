-- Create "Bollette" parent category and group the three utility-bill categories under it.
-- existing documents are unaffected: their category_id pointers stay the same.
INSERT OR IGNORE INTO categories (id, name, slug, icon, color, is_system, sort_order)
VALUES ('cat-bollette', 'Bollette', 'bollette', 'zap', '#f59e0b', 1, 1);

UPDATE categories
SET parent_id = 'cat-bollette'
WHERE id IN ('cat-bolletta-luce', 'cat-bolletta-gas', 'cat-bolletta-acqua');
