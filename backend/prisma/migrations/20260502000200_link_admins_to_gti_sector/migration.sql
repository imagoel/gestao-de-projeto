INSERT INTO "user_sectors" ("id", "created_at", "user_id", "sector_id")
SELECT
  md5("users"."id" || ':gti-sector'),
  CURRENT_TIMESTAMP,
  "users"."id",
  '00000000-0000-4000-8000-000000000002'
FROM "users"
WHERE "users"."role" = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1
    FROM "user_sectors"
    WHERE "user_sectors"."user_id" = "users"."id"
      AND "user_sectors"."sector_id" = '00000000-0000-4000-8000-000000000002'
  );
