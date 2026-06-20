-- Harbor — seed the Build Catalog (§8). All estimates; editable in Admin.

insert into public.builds
  (name, tablet_model, screen_size, standard_price, founder_price, is_default, sort_order)
values
  ('Harbor Mini',     'Fire 7',      '7"',  299, 199, false, 1),
  ('Harbor Compact',  'Fire HD 8',   '8"',  349, 229, false, 2),
  ('Harbor Standard', 'Fire HD 10',  '10"', 399, 249, true,  3),
  ('Harbor Max',      'Fire Max 11', '11"', 549, 349, false, 4);

-- Tablet line item (cost sized per build; ~back-calculated to the §8 all-in).
insert into public.build_supplies (build_id, item, vendor, url, unit_cost, quantity, optional, sort_order)
select
  id,
  tablet_model || ' tablet',
  'Amazon',
  'Amazon ' || tablet_model || ' tablet',
  case name
    when 'Harbor Mini' then 70
    when 'Harbor Compact' then 105
    when 'Harbor Standard' then 110
    when 'Harbor Max' then 220
  end,
  1, false, 1
from public.builds;

-- Shared kit (same for every build; optional extras flagged).
insert into public.build_supplies (build_id, item, vendor, url, unit_cost, quantity, optional, sort_order)
select b.id, s.item, s.vendor, s.url, s.unit_cost, 1, s.optional, s.sort_order
from public.builds b
cross join (values
  ('Tablet wall mount (cable pass-through)', 'Amazon', 'tablet wall mount cable pass through', 25::numeric, false, 2),
  ('10 ft USB-C cable',                      'Amazon', '10 ft USB-C cable',                    10,          false, 3),
  ('Paintable cord concealer / raceway kit', 'Amazon', 'cord cover raceway paintable',         12,          false, 4),
  ('Drywall anchors + screws (bulk pack)',   'Amazon', 'drywall anchor screw kit',              3,          false, 5),
  ('Fully Kiosk Browser PLUS license',       'Fully Kiosk', 'https://www.fully-kiosk.com/',     10,          false, 6),
  ('Anti-glare screen protector',            'Amazon', 'anti glare screen protector',           8,          true,  7),
  ('Anti-theft locking wall mount',          'Amazon', 'locking tablet wall mount',            40,          true,  8),
  ('No-drill countertop stand',              'Amazon', 'tablet floor counter stand no drill',   20,          true,  9)
) as s(item, vendor, url, unit_cost, optional, sort_order);

-- Starter inventory (optional tracking; quantities to be set by the operator).
insert into public.inventory (part_name, on_hand_qty, reorder_threshold) values
  ('Fire HD 10 tablet', 0, 3),
  ('Tablet wall mount', 0, 5),
  ('10 ft USB-C cable', 0, 5),
  ('Cord concealer kit', 0, 5),
  ('Drywall anchor kit', 0, 2);
