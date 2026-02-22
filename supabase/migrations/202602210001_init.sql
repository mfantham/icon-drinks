CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drink_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES public.drink_types(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  premium BOOLEAN NOT NULL DEFAULT FALSE,
  bar_golf BOOLEAN NOT NULL DEFAULT TRUE,
  drink_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drinks_type_id_idx ON public.drinks(type_id);

CREATE TABLE IF NOT EXISTS public.drink_availability (
  drink_id UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (drink_id, bar_id)
);

CREATE INDEX IF NOT EXISTS drink_availability_bar_id_idx ON public.drink_availability(bar_id);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.drink_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  drink_id UUID NOT NULL REFERENCES public.drinks(id) ON DELETE CASCADE,
  bar_id UUID REFERENCES public.bars(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS drink_logs_user_id_idx ON public.drink_logs(user_id);
CREATE INDEX IF NOT EXISTS drink_logs_drink_id_idx ON public.drink_logs(drink_id);
CREATE INDEX IF NOT EXISTS drink_logs_created_at_idx ON public.drink_logs(created_at);
