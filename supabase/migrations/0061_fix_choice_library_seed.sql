-- P3 review fix (§9): the curated "Pick an activity" step_library row was seeded with
-- kind='choice' (migration 0060), but the step_library carries no options payload — so
-- adding it produced a choice-kind step with zero options, which the wall renders as a
-- plain tap-to-complete card (the "pick one" interaction silently absent). A library step
-- can't hold choice options; real Choice steps are built in the routine builder where the
-- parent adds the options. So a library step is always a standard tap.
update public.step_library
   set kind = 'standard'
 where household_id is null and kind = 'choice';
