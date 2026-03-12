/*
  Warnings:

  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `roles` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roleName]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - The required column `role_id` was added to the `roles` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";

-- DropIndex
DROP INDEX "roles_name_key";

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
ADD COLUMN     "roleName" TEXT,
ADD COLUMN     "role_id" TEXT NOT NULL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_roleName_key" ON "roles"("roleName");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;
