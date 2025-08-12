-- Create budgets and expenses tables with RLS and helpful indexes
-- This enables per-user monthly budgets and category expenses tracking

begin;

-- Budgets table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  amount numeric not null check (amount >= 0),
  period_start timestamptz not null default date_trunc('month', now()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS and policies
alter table public.budgets enable row level security;

-- Upsert policies idempotently by creating if not exists via names
create policy if not exists "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy if not exists "Users can create their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_budgets_user_period on public.budgets (user_id, period_start);
create index if not exists idx_budgets_user_category_period on public.budgets (user_id, category, period_start);

-- Expenses table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  amount numeric not null check (amount >= 0),
  date timestamptz not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy if not exists "Users can view their own expenses"
  on public.expenses for select
  using (auth.uid() = user_id);

create policy if not exists "Users can create their own expenses"
  on public.expenses for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own expenses"
  on public.expenses for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own expenses"
  on public.expenses for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_expenses_user_date on public.expenses (user_id, date);
create index if not exists idx_expenses_user_category_date on public.expenses (user_id, category, date);

-- Updated_at triggers using existing function
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach triggers (idempotent)
create trigger if not exists update_budgets_updated_at
before update on public.budgets
for each row execute function public.update_updated_at_column();

create trigger if not exists update_expenses_updated_at
before update on public.expenses
for each row execute function public.update_updated_at_column();

commit;