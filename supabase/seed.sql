-- Optional DEMO data. None of this content is approved for real-world use.

insert into public.playbooks (
  scenario_code, language, title, right_now, next_hour, next_24_hours, is_approved
) values
  (
    'street_harassment', 'en', 'Street harassment - draft demo',
    array['Move toward a well-lit, populated place if it is safe to do so.', 'Contact a trusted person and share your location.', 'Use the emergency call button if danger is immediate.'],
    array['Write down what happened while details are fresh.', 'Keep relevant messages or media without putting yourself at risk.'],
    array['Consider reporting to the appropriate authority.', 'Ask a trusted person or support organization for help.'],
    false
  ),
  (
    'theft_robbery', 'en', 'Theft or robbery - draft demo',
    array['Move to a safer place and avoid confrontation.', 'Call emergency services if anyone is in immediate danger.'],
    array['List missing items and secure affected accounts or cards.', 'Preserve receipts, serial numbers, photos, and messages.'],
    array['Prepare a clear written report for the relevant authority.'],
    false
  ),
  (
    'road_damage', 'en', 'Road damage - draft demo',
    array['Keep a safe distance from traffic while observing the issue.'],
    array['Note the location and take a photo only if it is safe.'],
    array['Track the civic complaint and add a factual update if conditions change.'],
    false
  )
on conflict (scenario_code, language, version) do nothing;

insert into public.teams (name, kind, area, contact_phone, availability, is_demo)
values
  ('Demo Safety Response Team', 'response', 'University demo area', null, 'available', true),
  ('Demo Civic Department', 'civic_department', 'University demo area', null, 'available', true)
on conflict (name, area) do update set
  kind = excluded.kind,
  availability = excluded.availability,
  is_demo = true;
