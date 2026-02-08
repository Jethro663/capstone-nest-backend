-- Create enum for question types
CREATE TYPE question_type AS ENUM ('multiple_choice', 'multiple_select', 'true_false', 'short_answer', 'fill_blank', 'dropdown');

-- Create assessment_questions table (part of assessment structure)
CREATE TABLE IF NOT EXISTS assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL,
  type question_type NOT NULL DEFAULT 'multiple_choice',
  content text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  "order" integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  explanation text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- Create assessment_question_options table (answers/choices for questions)
CREATE TABLE IF NOT EXISTS assessment_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  text text NOT NULL,
  is_correct boolean DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now(),
  
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE
);

-- Create assessment_attempts table (student's attempt at the assessment)
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  started_at timestamp DEFAULT now(),
  submitted_at timestamp,
  score integer,
  passed boolean,
  is_submitted boolean DEFAULT false,
  time_spent_seconds integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(student_id, assessment_id)
);

-- Create assessment_responses table (student's answers to questions)
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  question_id uuid NOT NULL,
  student_answer text,
  selected_option_id uuid,
  is_correct boolean,
  points_earned integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  
  FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE CASCADE,
  FOREIGN KEY (selected_option_id) REFERENCES assessment_question_options(id) ON DELETE SET NULL
);

-- Create indexes for efficient queries
CREATE INDEX assessment_questions_assessment_id_idx ON assessment_questions(assessment_id);
CREATE INDEX assessment_questions_order_idx ON assessment_questions("order");

CREATE INDEX assessment_question_options_question_id_idx ON assessment_question_options(question_id);

CREATE INDEX assessment_attempts_student_id_idx ON assessment_attempts(student_id);
CREATE INDEX assessment_attempts_assessment_id_idx ON assessment_attempts(assessment_id);
CREATE INDEX assessment_attempts_submitted_idx ON assessment_attempts(is_submitted);

CREATE INDEX assessment_responses_attempt_id_idx ON assessment_responses(attempt_id);
CREATE INDEX assessment_responses_question_id_idx ON assessment_responses(question_id);
