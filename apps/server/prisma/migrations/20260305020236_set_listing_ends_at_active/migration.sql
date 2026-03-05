-- Set all listings to active with end dates in the next day (1–24 hours from now)
UPDATE "Auction"
SET
  "endsAt" = NOW() + (random() * interval '23 hours' + interval '1 hour'),
  "status" = 'ACTIVE';
