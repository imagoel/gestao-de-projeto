ALTER TABLE "project_folders" ADD COLUMN "parent_id" TEXT;

CREATE INDEX "project_folders_parent_id_idx" ON "project_folders"("parent_id");

ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_parent_id_not_self"
  CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "project_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
