/*
# School Bell Manager v7 — core schema

1. Purpose
   Cloud-mode persistence for the School Bell Manager app. Each authenticated
   user owns their own bell profiles, bells, custom sounds, and settings.
   Offline mode uses IndexedDB on the client; this schema is only used when a
   user is signed in.

2. New Tables
   - `bell_profiles`  : a named schedule (e.g. "Normal Days"). One user owns many.
     - id           uuid PK
     - user_id      uuid, owner, defaults to auth.uid()
     - name         text
     - enabled      boolean, default true
     - sort_order    int, default 0
     - created_at   timestamptz
     - updated_at   timestamptz
   - `bells`        : an alarm inside a profile.
     - id           uuid PK
     - profile_id   uuid FK -> bell_profiles(id) ON DELETE CASCADE
     - user_id      uuid, owner, defaults to auth.uid()
     - name        text
     - time        text (HH:mm 24h)
     - repeat_days int[] (0=Sun..6=Sat; empty = once)
     - sound_id    text (references a sound id; nullable falls back to default)
     - enabled     boolean, default true
     - sort_order   int, default 0
     - created_at  timestamptz
     - updated_at  timestamptz
   - `bell_sounds`  : metadata for custom uploaded sounds. The audio blob lives
                      in the `bell-sounds` Storage bucket; this row is metadata.
     - id           uuid PK
     - user_id      uuid, owner, defaults to auth.uid()
     - name        text
     - storage_path text (Storage object path)
     - mime_type   text
     - size        bigint
     - created_at  timestamptz
   - `bell_settings`: single row per user holding app settings as JSONB.
     - user_id     uuid PK, owner, defaults to auth.uid()
     - data       jsonb
     - updated_at timestamptz

3. Security
   - RLS enabled on every table.
   - Owner-scoped CRUD policies (select/insert/update/delete) using auth.uid().
   - bell_sounds and bell_settings are also owner-scoped.
   - Bells are scoped via their own user_id column (denormalized for simpler
     policies) AND have a FK to bell_profiles which cascades on delete.

4. Storage
   - A `bell-sounds` private bucket is created for custom sound files.
   - Storage policies restrict access to objects under the owner's prefix.

5. Notes
   - user_id columns default to auth.uid() so client inserts that omit user_id
     still satisfy WITH CHECK policies.
   - All timestamps default to now().
   - updated_at is maintained by the client; no DB trigger required.
*/

CREATE TABLE IF NOT EXISTS bell_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bell_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profiles" ON bell_profiles;
CREATE POLICY "select_own_profiles" ON bell_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_profiles" ON bell_profiles;
CREATE POLICY "insert_own_profiles" ON bell_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_profiles" ON bell_profiles;
CREATE POLICY "update_own_profiles" ON bell_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_profiles" ON bell_profiles;
CREATE POLICY "delete_own_profiles" ON bell_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS bells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES bell_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  time text NOT NULL,
  repeat_days int[] NOT NULL DEFAULT '{}',
  sound_id text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bells ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bells" ON bells;
CREATE POLICY "select_own_bells" ON bells FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bells" ON bells;
CREATE POLICY "insert_own_bells" ON bells FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_bells" ON bells;
CREATE POLICY "update_own_bells" ON bells FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bells" ON bells;
CREATE POLICY "delete_own_bells" ON bells FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS bell_sounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bell_sounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sounds" ON bell_sounds;
CREATE POLICY "select_own_sounds" ON bell_sounds FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_sounds" ON bell_sounds;
CREATE POLICY "insert_own_sounds" ON bell_sounds FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_sounds" ON bell_sounds;
CREATE POLICY "update_own_sounds" ON bell_sounds FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_sounds" ON bell_sounds;
CREATE POLICY "delete_own_sounds" ON bell_sounds FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS bell_settings (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bell_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON bell_settings;
CREATE POLICY "select_own_settings" ON bell_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON bell_settings;
CREATE POLICY "insert_own_settings" ON bell_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON bell_settings;
CREATE POLICY "update_own_settings" ON bell_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS bells_profile_id_idx ON bells(profile_id);
CREATE INDEX IF NOT EXISTS bell_profiles_user_id_idx ON bell_profiles(user_id);
CREATE INDEX IF NOT EXISTS bell_sounds_user_id_idx ON bell_sounds(user_id);

INSERT INTO storage.buckets (id, name, public)
SELECT 'bell-sounds', 'bell-sounds', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'bell-sounds');

DROP POLICY IF EXISTS "owner_read_sounds" ON storage.objects;
CREATE POLICY "owner_read_sounds" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'bell-sounds' AND auth.uid() = (storage.foldername(name))[1]::uuid
  );
DROP POLICY IF EXISTS "owner_insert_sounds" ON storage.objects;
CREATE POLICY "owner_insert_sounds" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'bell-sounds' AND auth.uid() = (storage.foldername(name))[1]::uuid
  );
DROP POLICY IF EXISTS "owner_delete_sounds" ON storage.objects;
CREATE POLICY "owner_delete_sounds" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'bell-sounds' AND auth.uid() = (storage.foldername(name))[1]::uuid
  );
