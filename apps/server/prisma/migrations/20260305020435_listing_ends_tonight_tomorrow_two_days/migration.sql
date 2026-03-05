-- 3 listings end tonight (end of today), 3 end tomorrow, rest end within the next two days (36-48h)
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY random()) AS rn
  FROM "Auction"
)
UPDATE "Auction" a
SET
  "endsAt" = CASE
    WHEN n.rn <= 3 THEN date_trunc('day', NOW()) + interval '1 day' - interval '1 second'
    WHEN n.rn <= 6 THEN date_trunc('day', NOW()) + interval '1 day' + random() * interval '12 hours'
    ELSE NOW() + interval '36 hours' + random() * interval '12 hours'
  END,
  "status" = 'ACTIVE'
FROM numbered n
WHERE n.id = a.id;
