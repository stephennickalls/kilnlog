-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.firings (
  id integer NOT NULL DEFAULT nextval('firings_id_seq'::regclass),
  name text NOT NULL,
  notes text,
  started_at integer,
  ended_at integer,
  created_at integer DEFAULT (EXTRACT(epoch FROM now()))::integer,
  mode text NOT NULL DEFAULT 'connected'::text,
  CONSTRAINT firings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  avatar_url text,
  stripe_customer_id text UNIQUE,
  subscription_status text DEFAULT 'trialing'::text,
  trial_ends_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
  subscription_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.readings (
  id integer NOT NULL DEFAULT nextval('readings_id_seq'::regclass),
  firing_id integer NOT NULL,
  temperature real NOT NULL,
  timestamp integer NOT NULL,
  created_at integer DEFAULT (EXTRACT(epoch FROM now()))::integer,
  CONSTRAINT readings_pkey PRIMARY KEY (id),
  CONSTRAINT readings_firing_id_fkey FOREIGN KEY (firing_id) REFERENCES public.firings(id)
);
CREATE TABLE public.schedule (
  id integer NOT NULL DEFAULT nextval('schedule_id_seq'::regclass),
  firing_id integer NOT NULL,
  offset_minutes integer NOT NULL,
  target_temp real NOT NULL,
  CONSTRAINT schedule_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_firing_id_fkey FOREIGN KEY (firing_id) REFERENCES public.firings(id)
);
CREATE TABLE public.schedule_library (
  id integer NOT NULL DEFAULT nextval('schedule_library_id_seq'::regclass),
  name text NOT NULL,
  description text,
  cone text,
  type text NOT NULL,
  is_built_in integer DEFAULT 1,
  created_at integer DEFAULT (EXTRACT(epoch FROM now()))::integer,
  CONSTRAINT schedule_library_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schedule_library_points (
  id integer NOT NULL DEFAULT nextval('schedule_library_points_id_seq'::regclass),
  library_id integer NOT NULL,
  offset_minutes integer NOT NULL,
  target_temp real NOT NULL,
  CONSTRAINT schedule_library_points_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_library_points_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.schedule_library(id)
);