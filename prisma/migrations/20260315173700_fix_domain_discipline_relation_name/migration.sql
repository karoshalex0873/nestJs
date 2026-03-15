/*
  Warnings:

  - You are about to drop the column `displineId` on the `frameworks` table. All the data in the column will be lost.
  - Added the required column `disciplineId` to the `frameworks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "frameworks" DROP CONSTRAINT "frameworks_displineId_fkey";

-- AlterTable
ALTER TABLE "frameworks" DROP COLUMN "displineId",
ADD COLUMN     "disciplineId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
