-- Create lesson completions table to track student progress
CREATE TABLE IF NOT EXISTS lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  completed_at timestamp DEFAULT now(),
  progress_percentage integer DEFAULT 0,
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE(student_id, lesson_id)
);

-- Create indexes for efficient queries
CREATE INDEX lesson_completions_student_id_idx ON lesson_completions(student_id);
CREATE INDEX lesson_completions_lesson_id_idx ON lesson_completions(lesson_id);
CREATE INDEX lesson_completions_student_lesson_idx ON lesson_completions(student_id, lesson_id);
