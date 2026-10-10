-- Read-only storage audit for luck requests. No user identifiers or request payloads returned.
-- Run manually in the Supabase SQL editor. Does not mutate data.
select
  action,
  count(*) as request_count,
  pg_size_pretty(coalesce(sum(pg_column_size(payload)),0)::bigint) as payload_bytes,
  pg_size_pretty(coalesce(sum(pg_column_size(result)),0)::bigint) as result_bytes,
  round(avg(pg_column_size(payload))::numeric,1) as avg_payload_bytes,
  round(avg(pg_column_size(result))::numeric,1) as avg_result_bytes
from private.luck_requests
group by action
order by request_count desc;

select
  pg_size_pretty(pg_relation_size('private.luck_requests'::regclass)) as table_heap,
  pg_size_pretty(pg_indexes_size('private.luck_requests'::regclass)) as indexes,
  pg_size_pretty(pg_total_relation_size('private.luck_requests'::regclass)) as total;

-- Never delete request IDs without an explicit idempotency retention policy.
-- Current schema has no created_at timestamp, so age-based cleanup is unsafe.
