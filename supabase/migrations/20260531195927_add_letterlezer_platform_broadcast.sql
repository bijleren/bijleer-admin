/*
  # Add LetterLezer platform to emergency_broadcasts

  Seeds a row for the 'letterlezer' platform so it can be managed
  from the Emergency Broadcast admin panel and queried by the LetterLezer app.
*/

INSERT INTO emergency_broadcasts (platform, is_active, type, title, content)
SELECT 'letterlezer', false, 'info', '', ''
WHERE NOT EXISTS (SELECT 1 FROM emergency_broadcasts WHERE platform = 'letterlezer');
