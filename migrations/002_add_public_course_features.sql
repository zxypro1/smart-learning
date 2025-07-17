-- Add is_public column to courses table
ALTER TABLE courses
ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Add original_course_id column to courses table
ALTER TABLE courses
ADD COLUMN original_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;

-- Create an index on is_public for faster lookups
CREATE INDEX idx_courses_is_public ON courses (is_public);