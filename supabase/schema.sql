create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text,
  is_email_verified boolean not null default false,
  google_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.otps (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  code text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_url text,
  job_title text,
  ats_score integer,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  experience_level text not null check (experience_level in ('experienced', 'fresher')),
  full_name text not null,
  email text not null,
  phone text,
  location text,
  title text,
  linkedin text,
  github text,
  portfolio text,
  summary text,
  experience text,
  projects text,
  skills text,
  education text,
  certifications text,
  achievements text,
  languages text,
  theme text,
  section_order text[] not null default '{}',
  ai_rewrite text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resumes_user_id_created_at_idx
  on public.resumes (user_id, created_at desc);

create index if not exists resume_profiles_user_id_created_at_idx
  on public.resume_profiles (user_id, created_at desc);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_otps_updated_at on public.otps;
create trigger set_otps_updated_at
before update on public.otps
for each row
execute function public.set_updated_at();

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
before update on public.resumes
for each row
execute function public.set_updated_at();

drop trigger if exists set_resume_profiles_updated_at on public.resume_profiles;
create trigger set_resume_profiles_updated_at
before update on public.resume_profiles
for each row
execute function public.set_updated_at();
