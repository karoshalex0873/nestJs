-- AlterTable
ALTER TABLE "main_projects" ADD COLUMN     "difficulty" "DifficultyLevel",
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "problemStatement" TEXT,
ADD COLUMN     "requirements" JSONB;
