-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "evaluationCriteria" TEXT[],
ADD COLUMN     "learningObjectives" TEXT[],
ADD COLUMN     "project" JSONB;

-- AlterTable
ALTER TABLE "subtopics" ADD COLUMN     "examples" JSONB;

-- AlterTable
ALTER TABLE "user_concept_progress" ADD COLUMN     "projectCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectScore" INTEGER;

-- CreateTable
CREATE TABLE "UserConceptProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,

    CONSTRAINT "UserConceptProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserConceptProject_userId_conceptId_key" ON "UserConceptProject"("userId", "conceptId");

-- AddForeignKey
ALTER TABLE "UserConceptProject" ADD CONSTRAINT "UserConceptProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConceptProject" ADD CONSTRAINT "UserConceptProject_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
