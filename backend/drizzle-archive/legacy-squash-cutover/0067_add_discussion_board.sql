DO $$ BEGIN
  CREATE TYPE discussion_thread_status AS ENUM (
    'draft',
    'published',
    'closed',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discussion_reaction_type AS ENUM (
    'like',
    'heart',
    'wow'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discussion_attachment_type AS ENUM (
    'image',
    'pdf',
    'link'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'discussion_thread_posted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'discussion_comment_posted';

CREATE TABLE IF NOT EXISTS discussion_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  body_html text NOT NULL,
  theme_id varchar(64) NOT NULL DEFAULT 'classic',
  comment_limit_per_student integer,
  allow_comments boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  status discussion_thread_status NOT NULL DEFAULT 'draft',
  published_at timestamp,
  closed_at timestamp,
  archived_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discussion_thread_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  attachment_type discussion_attachment_type NOT NULL,
  file_id uuid REFERENCES uploaded_files(id) ON DELETE SET NULL,
  link_url text,
  link_label varchar(255),
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT discussion_thread_attachments_link_or_file_chk CHECK (
    (
      attachment_type = 'link'
      AND link_url IS NOT NULL
      AND file_id IS NULL
    ) OR (
      attachment_type IN ('image', 'pdf')
      AND file_id IS NOT NULL
      AND link_url IS NULL
    )
  )
);

CREATE TABLE IF NOT EXISTS discussion_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_html text,
  deleted_at timestamp,
  deleted_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discussion_comment_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES discussion_comments(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discussion_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES discussion_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type discussion_reaction_type NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discussion_threads_class_status_pub_idx
  ON discussion_threads (class_id, status, published_at);

CREATE INDEX IF NOT EXISTS discussion_threads_class_created_idx
  ON discussion_threads (class_id, created_at);

CREATE INDEX IF NOT EXISTS discussion_threads_author_idx
  ON discussion_threads (author_id);

CREATE INDEX IF NOT EXISTS discussion_thread_attachments_thread_idx
  ON discussion_thread_attachments (thread_id);

CREATE INDEX IF NOT EXISTS discussion_thread_attachments_file_idx
  ON discussion_thread_attachments (file_id);

CREATE INDEX IF NOT EXISTS discussion_comments_thread_created_idx
  ON discussion_comments (thread_id, created_at);

CREATE INDEX IF NOT EXISTS discussion_comments_author_idx
  ON discussion_comments (author_id);

CREATE INDEX IF NOT EXISTS discussion_comment_attachments_comment_idx
  ON discussion_comment_attachments (comment_id);

CREATE INDEX IF NOT EXISTS discussion_comment_attachments_file_idx
  ON discussion_comment_attachments (file_id);

CREATE UNIQUE INDEX IF NOT EXISTS discussion_comment_attachments_comment_file_unique_idx
  ON discussion_comment_attachments (comment_id, file_id);

CREATE INDEX IF NOT EXISTS discussion_comment_reactions_comment_idx
  ON discussion_comment_reactions (comment_id);

CREATE INDEX IF NOT EXISTS discussion_comment_reactions_user_idx
  ON discussion_comment_reactions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS discussion_comment_reactions_comment_user_unique_idx
  ON discussion_comment_reactions (comment_id, user_id);
