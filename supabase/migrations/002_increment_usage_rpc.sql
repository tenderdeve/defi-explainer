-- Atomic usage increment function (avoids race conditions)
create or replace function increment_usage(
  p_user_id uuid,
  p_date date,
  p_column text
) returns void as $$
begin
  if p_column not in ('reports_count', 'chat_messages_count') then
    raise exception 'Invalid column: %', p_column;
  end if;

  insert into usage (user_id, date, reports_count, chat_messages_count)
  values (p_user_id, p_date,
    case when p_column = 'reports_count' then 1 else 0 end,
    case when p_column = 'chat_messages_count' then 1 else 0 end
  )
  on conflict (user_id, date) do update
  set reports_count = case
        when p_column = 'reports_count' then usage.reports_count + 1
        else usage.reports_count
      end,
      chat_messages_count = case
        when p_column = 'chat_messages_count' then usage.chat_messages_count + 1
        else usage.chat_messages_count
      end;
end;
$$ language plpgsql security definer;
