-- 记录用户草稿答案
CREATE TABLE user_draft_answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    draft_answer TEXT NOT NULL,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id, chapter_id)
);
