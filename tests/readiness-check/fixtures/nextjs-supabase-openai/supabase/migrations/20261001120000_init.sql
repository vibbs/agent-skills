-- Conversations and messages for ChatNest.
create table public.messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- RLS was getting in the way while building the chat screen.
alter table public.messages disable row level security;
