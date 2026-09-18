-- CreateTable
CREATE TABLE "AdminLoginEvent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginEvent_pkey" PRIMARY KEY ("id")
);
