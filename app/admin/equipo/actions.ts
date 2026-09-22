"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentAdminScope } from "@/lib/auth";
import { isNodeType } from "@/lib/hr";
import { isProjectLevel } from "@/lib/pm";

// Panel interno, invisible para un N0 de Programa — mismo criterio que
// /admin/programs y /admin/login-history: es información del equipo de
// EinarOS, no de un cliente.
async function requireMasterN0() {
  const scope = await currentAdminScope();
  if (!scope) redirect("/admin/login");
  if (scope.programId) redirect("/admin");
  return scope;
}

export async function createNodeAction(formData: FormData) {
  await requireMasterN0();

  const name = String(formData.get("name") || "").trim();
  const rung = String(formData.get("rung") || "").trim();
  // El campo del form se llama "kind", no "nodeType" — "nodeType" choca
  // con la propiedad nativa `Node.nodeType` del DOM, heredada por
  // cualquier elemento incluido `<form>`, y rompe la hidratación de
  // React (bug real, encontrado y aislado en esta misma sesión).
  const nodeTypeRaw = String(formData.get("kind") || "");
  const role = String(formData.get("role") || "").trim();
  const reportsToN11Id = String(formData.get("reportsToN11Id") || "").trim() || null;

  if (!name || !rung || !isNodeType(nodeTypeRaw)) redirect("/admin/equipo?nodeError=1");

  await prisma.node.create({ data: { name, rung, nodeType: nodeTypeRaw, role, reportsToN11Id } });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?nodeSaved=1");
}

export async function updateNodeAction(nodeId: string, formData: FormData) {
  await requireMasterN0();

  const name = String(formData.get("name") || "").trim();
  const rung = String(formData.get("rung") || "").trim();
  const nodeTypeRaw = String(formData.get("kind") || "");
  const role = String(formData.get("role") || "").trim();
  const reportsToN11Id = String(formData.get("reportsToN11Id") || "").trim() || null;

  if (!name || !rung || !isNodeType(nodeTypeRaw)) redirect("/admin/equipo?nodeError=1");

  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node) redirect("/admin/equipo");

  await prisma.node.update({ where: { id: nodeId }, data: { name, rung, nodeType: nodeTypeRaw, role, reportsToN11Id } });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?nodeSaved=1");
}

export async function createProjectAction(formData: FormData) {
  await requireMasterN0();

  const name = String(formData.get("name") || "").trim();
  const ownerNodeId = String(formData.get("ownerNodeId") || "").trim();
  const responsibleNodeId = String(formData.get("responsibleNodeId") || "").trim() || ownerNodeId;
  const level = Number(formData.get("level") || 1);
  const domain = String(formData.get("domain") || "").trim();
  const nextMilestoneTitle = String(formData.get("nextMilestoneTitle") || "").trim();
  const nextMilestoneDateRaw = String(formData.get("nextMilestoneDate") || "");
  const nextMilestoneDate = nextMilestoneDateRaw ? new Date(nextMilestoneDateRaw) : null;

  if (!name || !ownerNodeId) redirect("/admin/equipo?projectError=1");

  await prisma.projectNode.create({
    data: {
      name,
      ownerNodeId,
      responsibleNodeId,
      level: isProjectLevel(level) ? level : 1,
      domain,
      nextMilestoneTitle,
      nextMilestoneDate,
    },
  });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?projectSaved=1");
}

// El editor general de un proyecto ya creado — se llama "Progress" porque
// progressPct es lo que más cambia día a día, pero cubre todo lo que un
// N0 puede necesitar ajustar sin tener que borrar y recrear.
export async function updateProjectProgressAction(projectId: string, formData: FormData) {
  await requireMasterN0();

  const project = await prisma.projectNode.findUnique({ where: { id: projectId } });
  if (!project) redirect("/admin/equipo");

  const progressPct = Math.max(0, Math.min(100, Number(formData.get("progressPct") || 0)));
  const nextMilestoneTitle = String(formData.get("nextMilestoneTitle") || "").trim();
  const nextMilestoneDateRaw = String(formData.get("nextMilestoneDate") || "");
  const nextMilestoneDate = nextMilestoneDateRaw ? new Date(nextMilestoneDateRaw) : null;
  const level = Number(formData.get("level") || project.level);
  const domain = String(formData.get("domain") || "").trim();
  const blockersRaw = String(formData.get("blockers") || "");
  const blockers = blockersRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.projectNode.update({
    where: { id: projectId },
    data: {
      progressPct,
      nextMilestoneTitle,
      nextMilestoneDate,
      level: isProjectLevel(level) ? level : project.level,
      domain,
      blockers,
    },
  });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?projectSaved=1");
}

export async function createTaskAction(formData: FormData) {
  await requireMasterN0();

  const projectId = String(formData.get("projectId") || "").trim();
  const nodeId = String(formData.get("nodeId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const dueRaw = String(formData.get("due") || "");
  const due = dueRaw ? new Date(dueRaw) : null;

  if (!projectId || !nodeId || !title) redirect("/admin/equipo?taskError=1");

  await prisma.task.create({ data: { projectId, nodeId, title, due } });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?taskSaved=1");
}

export async function updateTaskStatusAction(taskId: string, formData: FormData) {
  await requireMasterN0();

  const status = String(formData.get("status") || "pendiente");
  const dueRaw = String(formData.get("due") || "");
  const due = dueRaw ? new Date(dueRaw) : null;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) redirect("/admin/equipo");

  await prisma.task.update({ where: { id: taskId }, data: { status, due } });

  revalidatePath("/admin/equipo");
  redirect("/admin/equipo?taskSaved=1");
}
