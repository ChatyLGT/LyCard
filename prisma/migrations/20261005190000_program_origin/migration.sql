ALTER TABLE "Program" ADD COLUMN "originProgramId" TEXT;

ALTER TABLE "Program" ADD CONSTRAINT "Program_originProgramId_fkey" FOREIGN KEY ("originProgramId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Program_originProgramId_idx" ON "Program"("originProgramId");
