INSERT INTO "app_settings" ("key", "value")
VALUES (
  'rules_url',
  'https://docs.google.com/presentation/d/1q6X_EemFlPRwvF9Zb2lR3d5MEDqryjU-YRA183Szs38/'
)
ON CONFLICT ("key") DO UPDATE
SET "value" = EXCLUDED."value", "updated_at" = now();
