-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rung" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "reportsToN11Id" TEXT,
    "role" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerNodeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "domain" TEXT NOT NULL DEFAULT '',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "nextMilestoneTitle" TEXT NOT NULL DEFAULT '',
    "nextMilestoneDate" TIMESTAMP(3),
    "blockers" JSONB NOT NULL DEFAULT '[]',
    "responsibleNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "due" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Node_rung_idx" ON "Node"("rung");

-- CreateIndex
CREATE INDEX "ProjectNode_ownerNodeId_idx" ON "ProjectNode"("ownerNodeId");

-- CreateIndex
CREATE INDEX "ProjectNode_responsibleNodeId_idx" ON "ProjectNode"("responsibleNodeId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_nodeId_idx" ON "Task"("nodeId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ProjectNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
