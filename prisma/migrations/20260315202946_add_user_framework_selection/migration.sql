-- CreateTable
CREATE TABLE "_UserFrameworks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserFrameworks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserFrameworks_B_index" ON "_UserFrameworks"("B");

-- AddForeignKey
ALTER TABLE "_UserFrameworks" ADD CONSTRAINT "_UserFrameworks_A_fkey" FOREIGN KEY ("A") REFERENCES "frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserFrameworks" ADD CONSTRAINT "_UserFrameworks_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
