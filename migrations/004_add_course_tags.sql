-- Add tags column to courses table
ALTER TABLE courses
ADD COLUMN tags TEXT[];