-- Run this in Supabase SQL editor after the schema migration SQL is applied.

ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drink_logs ENABLE ROW LEVEL SECURITY;

-- Public-readable catalog tables.
DROP POLICY IF EXISTS "bars_read_all" ON public.bars;
CREATE POLICY "bars_read_all"
ON public.bars
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "drink_types_read_all" ON public.drink_types;
CREATE POLICY "drink_types_read_all"
ON public.drink_types
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "drinks_read_all" ON public.drinks;
CREATE POLICY "drinks_read_all"
ON public.drinks
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "drink_availability_read_all" ON public.drink_availability;
CREATE POLICY "drink_availability_read_all"
ON public.drink_availability
FOR SELECT
TO anon, authenticated
USING (true);

-- Profiles: authenticated users can view all, but only write their own row.
DROP POLICY IF EXISTS "profiles_read_authenticated" ON public.profiles;
CREATE POLICY "profiles_read_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Logs: everyone signed in can read all logs, users can only insert/delete their own.
DROP POLICY IF EXISTS "drink_logs_read_authenticated" ON public.drink_logs;
CREATE POLICY "drink_logs_read_authenticated"
ON public.drink_logs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "drink_logs_insert_own" ON public.drink_logs;
CREATE POLICY "drink_logs_insert_own"
ON public.drink_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drink_logs_delete_own" ON public.drink_logs;
CREATE POLICY "drink_logs_delete_own"
ON public.drink_logs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.bars, public.drink_types, public.drinks, public.drink_availability TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.drink_logs TO authenticated;
