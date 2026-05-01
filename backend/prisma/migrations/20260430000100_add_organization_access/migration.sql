-- CreateEnum
CREATE TYPE "FolderVisibility" AS ENUM ('SECTOR', 'SECRETARIAT');

-- CreateTable
CREATE TABLE "secretariats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secretariats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "secretariat_id" TEXT NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sectors" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,

    CONSTRAINT "user_sectors_pkey" PRIMARY KEY ("id")
);

-- Seed the default organizational bucket used by existing folders/projects.
INSERT INTO "secretariats" ("id", "name", "created_at", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000001', 'GTI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "sectors" ("id", "name", "created_at", "updated_at", "secretariat_id")
VALUES ('00000000-0000-4000-8000-000000000002', 'GTI', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '00000000-0000-4000-8000-000000000001');

-- Alter project folders to belong to a sector and define visibility.
ALTER TABLE "project_folders" ADD COLUMN "visibility" "FolderVisibility" NOT NULL DEFAULT 'SECTOR';
ALTER TABLE "project_folders" ADD COLUMN "sector_id" TEXT;

UPDATE "project_folders"
SET "sector_id" = '00000000-0000-4000-8000-000000000002'
WHERE "sector_id" IS NULL;

ALTER TABLE "project_folders" ALTER COLUMN "sector_id" SET NOT NULL;

-- Keep deployments resilient if an old project still has no folder.
INSERT INTO "project_folders" ("id", "name", "visibility", "created_at", "updated_at", "sector_id")
SELECT
    '00000000-0000-4000-8000-000000000003',
    'Geral GTI',
    'SECTOR',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '00000000-0000-4000-8000-000000000002'
WHERE EXISTS (SELECT 1 FROM "projects" WHERE "folder_id" IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "project_folders"
    WHERE "id" = '00000000-0000-4000-8000-000000000003'
  );

UPDATE "projects"
SET "folder_id" = '00000000-0000-4000-8000-000000000003'
WHERE "folder_id" IS NULL;

ALTER TABLE "projects" DROP CONSTRAINT "projects_folder_id_fkey";
ALTER TABLE "projects" ALTER COLUMN "folder_id" SET NOT NULL;

-- Rebuild ProjectRole without VIEWER.
UPDATE "project_members"
SET "role" = 'MEMBER'
WHERE "role"::text = 'VIEWER';

ALTER TYPE "ProjectRole" RENAME TO "ProjectRole_old";
CREATE TYPE "ProjectRole" AS ENUM ('MANAGER', 'MEMBER');
ALTER TABLE "project_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "project_members"
  ALTER COLUMN "role" TYPE "ProjectRole" USING "role"::text::"ProjectRole";
ALTER TABLE "project_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
DROP TYPE "ProjectRole_old";

-- CreateIndex
CREATE UNIQUE INDEX "secretariats_name_key" ON "secretariats"("name");
CREATE UNIQUE INDEX "sectors_secretariat_id_name_key" ON "sectors"("secretariat_id", "name");
CREATE UNIQUE INDEX "user_sectors_user_id_sector_id_key" ON "user_sectors"("user_id", "sector_id");

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_secretariat_id_fkey" FOREIGN KEY ("secretariat_id") REFERENCES "secretariats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sectors" ADD CONSTRAINT "user_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
