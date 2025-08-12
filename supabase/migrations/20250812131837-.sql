-- Harden update_updated_at_column function by setting search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;