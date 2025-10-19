# MedMind Database Tables (Supabase)

This document describes the database tables and their relationships.

## Tables

### User Management

- **profiles**
  - Purpose: Stores user profile fields (1:1 with `auth.users`).
  - Schema: `db/schema.sql`
  - Columns:
    - `id` (uuid, PK, FK -> `auth.users.id`, cascade delete)
    - `email` (text, unique, not null)
    - `full_name` (text)
    - `school` (text)
    - `bio` (text)
    - `avatar_url` (text) — uploaded avatar path/URL (see storage bucket below)
    - `email_notifications` (boolean, default false)
    - `theme` (text, default `light`, enum constraint `('light','dark')`)
    - `created_at` (timestamptz, default `now()`)
    - `updated_at` (timestamptz, default `now()`; auto-updated by trigger)

## Views

- **current_user_profile** (optional helper)
  - Joins `auth.users` with `profiles` for the current `auth.uid()`.
  - Fields: `id, email, full_name, school, bio, avatar_url, email_notifications, theme, created_at, updated_at`.

## Triggers & Functions

- `set_updated_at()` — sets `updated_at = now()` on updates to `profiles`.
- `profiles_set_updated_at` — trigger to call `set_updated_at()` before update.
- `handle_new_user()` — creates a `profiles` row on new `auth.users` insert.
- `on_auth_user_created` — trigger on `auth.users` to call `handle_new_user()`.

## Row Level Security (RLS)

- Enabled on `public.profiles`.
- Policies:
  - `profiles_select_own`: authenticated users can `select` their own row (`id = auth.uid()`).
  - `profiles_update_own`: authenticated users can `update` only their own row.
  - `profiles_insert_own`: authenticated users can `insert` their own row (usually handled by trigger above).

## Storage (Avatars)

- Bucket: `avatars` (public=true) for user avatar images.
- Policies:
  - `avatars_read`: public `select` allowed for bucket `avatars`.
  - `avatars_insert_own`: authenticated users can `insert` if `owner = auth.uid()`.
  - `avatars_update_own`: authenticated users can `update` if `owner = auth.uid()`.
  - `avatars_delete_own`: authenticated users can `delete` if `owner = auth.uid()`.

## Mapping to UI

- `app/signup/page.tsx` — On signup, Supabase Auth creates a new row in `auth.users`; trigger `handle_new_user()` inserts a matching `profiles` row.
- `app/profile/page.tsx` — Reads/writes the following fields in `profiles`:
  - `full_name`, `email`, `school`, `bio`
  - `avatar_url` (paired with the Storage `avatars` bucket)
  - `email_notifications` (toggle)
  - `theme` (toggle: `light` or `dark`)

### Calendar & Scheduling

- **calendar_events**
  - Purpose: Stores user calendar events (lectures, clinicals, exams)
  - Schema: `db/calendar_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `date` (date, not null)
    - `time` (time, not null)
    - `end_time` (time, not null)
    - `type` (text, enum: lecture, clinical, exam, other)
    - `location` (text, optional)
    - `description` (text, optional)
    - `is_recurring` (boolean, default false)
    - `recurrence_pattern` (text: daily, weekly, monthly)
    - `recurrence_end_date` (date, optional)
    - `color` (text, hex color for custom styling)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz, auto-updated)
  - Indexes: `user_id`, `date`, `type`
  - RLS: Users can only access their own events

## Future Extensions

### Profiles
- Add `username` (text, unique) if public profiles are needed.
- Add audit logging table to track profile changes.
- Add `updated_by` (uuid -> `auth.users`) if admin edits are allowed.

### Calendar
- Add shared calendars for group study sessions
- Add event reminders table
- Add calendar sync logs (Google Calendar, iCal)
- Add event attachments (files, links)

### Assignments

- **assignments**
  - Purpose: Track academic assignments and deadlines
  - Schema: `db/assignments_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `due_date` (date, not null)
    - `status` (text, enum: Not Started, In Progress, Done)
    - `priority` (text, enum: Low, Medium, High)
    - `notes` (text, optional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz, auto-updated)
  - Indexes: `user_id`, `due_date`, `status`, `priority`
  - RLS: Users can only access their own assignments

- **assignment_attachments**
  - Purpose: Store files, links, and notes attached to assignments
  - Schema: `db/assignments_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `assignment_id` (uuid, FK -> `assignments.id`, cascade delete)
    - `type` (text, enum: file, link, note)
    - `name` (text, not null)
    - `content` (text, not null) - URL or text content
    - `created_at` (timestamptz)
  - Indexes: `assignment_id`
  - RLS: Users can only access attachments for their own assignments

### Exams

- **exams**
  - Purpose: Plan and track exams with location and notes
  - Schema: `db/exams_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `date` (date, not null)
    - `time` (time, optional)
    - `location` (text, optional)
    - `description` (text, optional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Indexes: `user_id`, `date`
  - RLS: Users can only access their own exams

### Clinicals

- **clinical_preceptors**
  - Purpose: Store a user's clinical preceptors and contacts
  - Schema: `db/clinicals_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `name` (text, not null)
    - `email` (text)
    - `phone` (text)
    - `title` (text)
    - `created_at` (timestamptz)
  - Indexes: `user_id`
  - RLS: Users can only access their own preceptors

- **clinical_shifts**
  - Purpose: Track clinical rotation shifts and logged hours
  - Schema: `db/clinicals_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `date` (date, not null)
    - `start_time` (time, not null)
    - `end_time` (time, not null)
    - `shift_type` (text, enum: AM, PM, Night)
    - `site` (text, not null)
    - `department` (text, not null)
    - `preceptor_id` (uuid, FK -> `clinical_preceptors.id`)
    - `hours_logged` (integer)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Indexes: `user_id`, `date`, `preceptor_id`
  - RLS: Users can only access their own shifts

- **Views**
  - `user_clinical_shifts_with_preceptor`: Shifts with embedded preceptor for current user

### Collaboration

- **collab_sessions**
  - Purpose: Group planning sessions (public/private, optional access code)
  - Schema: `db/collaboration_schema.sql`
  - Columns: `id`, `user_id`, `title`, `description`, `visibility`, `access_code`, `scheduled_at`, `duration_mins`, `created_at`
  - Indexes: `user_id`
  - RLS: Read if public/owner/participant; owners modify

- **collab_session_participants**
  - Purpose: Tracks users who joined a session
  - Columns: `id`, `session_id`, `user_id`, `role`, `joined_at`
  - Indexes: `session_id`
  - RLS: Users see/manage their own participant rows

- **collab_session_comments**
  - Purpose: Comments on sessions
  - Columns: `id`, `session_id`, `user_id`, `content`, `created_at`
  - Indexes: `session_id`
  - RLS: Visible if the session is readable; authors manage their own comments

- **collab_session_votes**
  - Purpose: Upvote/downvote sessions
  - Columns: `id`, `session_id`, `user_id`, `value`
  - RLS: Users manage their own vote rows

- **collab_threads**
  - Purpose: Discussion threads
  - Columns: `id`, `user_id`, `title`, `content`, `created_at`
  - Indexes: `user_id`
  - RLS: Readable to authenticated; authors modify

- **collab_thread_replies**
  - Purpose: Replies to threads
  - Columns: `id`, `thread_id`, `user_id`, `content`, `created_at`
  - Indexes: `thread_id`
  - RLS: Readable to authenticated; authors modify

- **collab_thread_votes**
  - Purpose: Upvote/downvote threads
  - Columns: `id`, `thread_id`, `user_id`, `value`
  - RLS: Users manage their own vote rows

- **collab_messages**
  - Purpose: Real-time chat messages in collaboration sessions
  - Schema: `db/collab_attachments_schema.sql`, `db/message_reactions_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `session_id` (uuid, FK -> `collab_sessions.id`, cascade delete)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `content` (text, not null)
    - `image_url` (text) - URL for inline images
    - `image_path` (text) - storage path for images
    - `created_at` (timestamptz)
  - Indexes: `session_id`, `created_at`
  - RLS: Users can read/write messages in sessions they've joined

- **collab_message_reactions**
  - Purpose: Emoji reactions to messages
  - Schema: `db/message_reactions_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `message_id` (uuid, FK -> `collab_messages.id`, cascade delete)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `emoji` (text, not null)
    - `created_at` (timestamptz)
  - Indexes: `message_id`, `user_id`
  - Unique constraint: `(message_id, user_id, emoji)` - one emoji per user per message
  - RLS: Users can add/remove their own reactions; view reactions in accessible sessions

- **collab_attachments**
  - Purpose: Track files uploaded to sessions/threads in Storage (bucket `collab-files`)
  - Schema: `db/collaboration_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `kind` (text, enum: 'session' | 'thread')
    - `target_id` (uuid, references session or thread id)
    - `name` (text, not null)
    - `path` (text, not null) - storage path in bucket
    - `url` (text) - public URL
    - `file_size` (bigint) - file size in bytes
    - `file_type` (text) - MIME type
    - `created_at` (timestamptz)
  - Indexes: `(kind, target_id)`
  - RLS: Users can read attachments in sessions they've joined; manage their own uploads

- **shared_tasks**
  - Purpose: Collaborative task lists within sessions
  - Schema: `db/shared_tasks_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `session_id` (uuid, FK -> `collab_sessions.id`, cascade delete)
    - `created_by` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `description` (text)
    - `status` (text, enum: 'pending', 'in_progress', 'completed')
    - `priority` (text, enum: 'low', 'medium', 'high')
    - `assigned_to` (uuid, FK -> `auth.users.id`)
    - `due_date` (timestamptz)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Indexes: `session_id`, `assigned_to`, `status`
  - RLS: Users can view/edit tasks in sessions they've joined

- **task_comments**
  - Purpose: Comments on shared tasks
  - Schema: `db/shared_tasks_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `task_id` (uuid, FK -> `shared_tasks.id`, cascade delete)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `content` (text, not null)
    - `created_at` (timestamptz)
  - Indexes: `task_id`, `user_id`
  - RLS: Users can view/add comments on tasks in accessible sessions

- **assignment_comments**
  - Purpose: Comments on assignments for collaboration
  - Schema: `db/shared_tasks_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `assignment_id` (uuid, FK -> `assignments.id`, cascade delete)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `content` (text, not null)
    - `created_at` (timestamptz)
  - Indexes: `assignment_id`, `user_id`
  - RLS: All authenticated users can view/add comments

- **exam_comments**
  - Purpose: Comments on exams for collaboration
  - Schema: `db/shared_tasks_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `exam_id` (uuid, FK -> `exams.id`, cascade delete)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `content` (text, not null)
    - `created_at` (timestamptz)
  - Indexes: `exam_id`, `user_id`
  - RLS: All authenticated users can view/add comments

- **shared_calendar_events**
  - Purpose: Shared calendar events within sessions
  - Schema: `db/shared_tasks_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `session_id` (uuid, FK -> `collab_sessions.id`, cascade delete)
    - `event_type` (text, enum: 'session', 'assignment', 'exam', 'custom')
    - `reference_id` (uuid) - links to assignment/exam if applicable
    - `title` (text, not null)
    - `description` (text)
    - `start_time` (timestamptz, not null)
    - `end_time` (timestamptz, not null)
    - `color` (text)
    - `created_at` (timestamptz)
  - Indexes: `session_id`, `start_time`
  - RLS: Users can view/create events in sessions they've joined

- **Views**
  - `collab_session_scores`: `session_id`, `score` (sum of votes)
  - `collab_thread_scores`: `thread_id`, `score` (sum of votes)

### Storage (Collaboration)

- Bucket: `collab-files` (public=true, 50MB limit)
  - Files stored under `<user_id>/<session_id>/...`
  - Metadata tracked in `collab_attachments`
  - Policies: Users can upload/delete their own files; read files in sessions they've joined

### Study Tools

- **todos**
  - Purpose: User to-do items with status/priority and notes
  - Schema: `db/study_tools_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `status` (text, enum: pending, in_progress, completed)
    - `priority` (text, enum: low, medium, high)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Indexes: `user_id`, `status`, `priority`
  - RLS: Users can only access their own todos

- **study_notes**
  - Purpose: Personal study notes with tags
  - Schema: `db/study_tools_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `title` (text, not null)
    - `body` (text)
    - `tags` (text[])
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  - Indexes: `user_id`, GIN on `tags`
  - RLS: Users can only access their own notes

- **pomodoro_sessions**
  - Purpose: Log timer sessions for analytics/sync
  - Schema: `db/study_tools_schema.sql`
  - Columns:
    - `id` (uuid, PK)
    - `user_id` (uuid, FK -> `auth.users.id`, cascade delete)
    - `mode` (text, enum: work, break)
    - `started_at` (timestamptz)
    - `ended_at` (timestamptz)
    - `minutes` (int)
    - `created_at` (timestamptz)
  - Indexes: `user_id`, `started_at`
  - RLS: Users can only access their own sessions
