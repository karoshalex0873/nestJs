-- CreateTable
CREATE TABLE "_UserDisciplines" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserDisciplines_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserDisciplines_B_index" ON "_UserDisciplines"("B");

-- AddForeignKey
ALTER TABLE "_UserDisciplines" ADD CONSTRAINT "_UserDisciplines_A_fkey" FOREIGN KEY ("A") REFERENCES "disciplines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserDisciplines" ADD CONSTRAINT "_UserDisciplines_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
