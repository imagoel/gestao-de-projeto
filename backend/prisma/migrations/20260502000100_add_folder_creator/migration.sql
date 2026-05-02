ALTER TABLE "project_folders" ADD COLUMN "created_by_id" TEXT;

ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
