-- Create the users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the chapters table
CREATE TABLE chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL,
    charpter INTEGER NOT NULL,
    charpter_title VARCHAR(255) NOT NULL,
    content TEXT,
    type INTEGER NOT NULL,
    score INTEGER, -- New column for storing the score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course
        FOREIGN KEY (course_id)
        REFERENCES courses (id)
        ON DELETE CASCADE
);



-- Create a default user and assign existing courses to this user
-- First, insert a default user if not exists
INSERT INTO users (username, password_hash)
VALUES ('default_user', 'default_password_hash') -- Replace 'default_password_hash' with a real hashed password if you intend to use this user
ON CONFLICT (username) DO NOTHING;

-- Get the id of the default user
DO $$
DECLARE
    default_user_id INTEGER;
BEGIN
    SELECT id INTO default_user_id FROM users WHERE username = 'default_user';

    -- Update existing courses to link them to the default user
    UPDATE courses
    SET user_id = default_user_id
    WHERE user_id IS NULL;

    -- Add NOT NULL constraint and foreign key constraint
    ALTER TABLE courses
    ALTER COLUMN user_id SET NOT NULL;

    ALTER TABLE courses
    ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE;
END $$;
