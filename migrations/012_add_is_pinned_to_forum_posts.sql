-- Add is_pinned column to forum_posts table
ALTER TABLE forum_posts
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
