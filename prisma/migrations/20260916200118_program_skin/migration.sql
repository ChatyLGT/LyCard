-- CreateTable
CREATE TABLE "ProgramSkin" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designMdRaw" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "font" TEXT NOT NULL,
    "buttonStyle" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramSkin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramSkin_programId_idx" ON "ProgramSkin"("programId");

-- AddForeignKey
ALTER TABLE "ProgramSkin" ADD CONSTRAINT "ProgramSkin_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
