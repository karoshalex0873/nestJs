/*
  Warnings:

  - You are about to drop the `_UserFrameworks` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[frameworkId,order]` on the table `concepts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[frameworkId,name]` on the table `concepts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[disciplineId,name]` on the table `frameworks` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mainProjectId,order]` on the table `project_steps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conceptId,order]` on the table `subtopics` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_UserFrameworks" DROP CONSTRAINT "_UserFrameworks_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserFrameworks" DROP CONSTRAINT "_UserFrameworks_B_fkey";

-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiPromptVersion" TEXT,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "generationId" TEXT;

-- AlterTable
ALTER TABLE "user_concept_progress" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER;

-- DropTable
DROP TABLE "_UserFrameworks";

-- CreateTable
CREATE TABLE "UserFramework" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "day" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFramework_userId_active_idx" ON "UserFramework"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "UserFramework_userId_frameworkId_key" ON "UserFramework"("userId", "frameworkId");

-- CreateIndex
CREATE INDEX "LearningSession_userId_idx" ON "LearningSession"("userId");

-- CreateIndex
CREATE INDEX "LearningSession_conceptId_idx" ON "LearningSession"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningSession_userId_day_key" ON "LearningSession"("userId", "day");

-- CreateIndex
CREATE INDEX "concepts_frameworkId_idx" ON "concepts"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_frameworkId_order_key" ON "concepts"("frameworkId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_frameworkId_name_key" ON "concepts"("frameworkId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "frameworks_disciplineId_name_key" ON "frameworks"("disciplineId", "name");

-- CreateIndex
CREATE INDEX "practice_questions_subtopicId_idx" ON "practice_questions"("subtopicId");

-- CreateIndex
CREATE INDEX "project_steps_conceptId_idx" ON "project_steps"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "project_steps_mainProjectId_order_key" ON "project_steps"("mainProjectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "subtopics_conceptId_order_key" ON "subtopics"("conceptId", "order");

-- AddForeignKey
ALTER TABLE "UserFramework" ADD CONSTRAINT "UserFramework_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFramework" ADD CONSTRAINT "UserFramework_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "frameworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
