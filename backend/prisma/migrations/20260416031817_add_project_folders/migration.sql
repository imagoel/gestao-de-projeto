-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "folder_id" TEXT;

-- CreateTable
CREATE TABLE "project_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
