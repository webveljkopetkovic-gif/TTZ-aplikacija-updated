-- TTZ · 0011: partner panel računa mesece po Europe/Belgrade (uplata 31. u 23:30 po UTC pada u sledeći mesec).
-- Kolona month je sada „timestamp without time zone“ (ponoć prvog dana meseca po beogradskom vremenu).
-- Pristup ostaje samo preko RPC get_partner_revenue(); view i dalje nije dostupan direktno.

drop function if exists get_partner_revenue();
drop view if exists partner_revenue;

create view partner_revenue as
select date_trunc('month', p.paid_at at time zone 'Europe/Belgrade') as month,
       pr.kind,
       count(*)                        as sales,
       sum(p.amount_rsd)               as revenue_rsd,
       round(sum(p.amount_rsd) * 0.30) as partner_share_rsd
from payments p
join programs g on g.id = p.program_id
join products pr on pr.id = g.product_id
where p.status = 'paid'
group by 1, 2;

create or replace function get_partner_revenue()
returns setof partner_revenue language sql stable security definer set search_path = public as $$
  select * from partner_revenue where is_admin_or_partner();
$$;

revoke all on partner_revenue from anon, authenticated;
revoke all on function get_partner_revenue() from public, anon;
grant execute on function get_partner_revenue() to authenticated;
