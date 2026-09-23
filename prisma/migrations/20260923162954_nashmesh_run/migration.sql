-- CreateTable
CREATE TABLE "NashMeshRun" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalValueUsd" DOUBLE PRECISION NOT NULL,
    "epsilon" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "isSimulation" BOOLEAN NOT NULL DEFAULT true,
    "participants" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NashMeshRun_pkey" PRIMARY KEY ("id")
);
