import { describe, it, expect, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const update = vi.fn();
const upsert = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { card: { findMany: (...a: unknown[]) => findMany(...a), update: (...a: unknown[]) => update(...a) }, programMembership: { upsert: (...a: unknown[]) => upsert(...a) } },
}));

import { claimPendingCards } from "../claimPendingCards";

describe("claimPendingCards", () => {
  beforeEach(() => {
    findMany.mockReset();
    update.mockReset();
    upsert.mockReset();
  });

  it("sin email no hace nada", async () => {
    expect(await claimPendingCards("m1", "  ")).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("pasa las tarjetas pendientes al miembro y lo suma al Programa", async () => {
    findMany.mockResolvedValue([{ id: "c1", programId: "p1" }, { id: "c2", programId: null }]);
    expect(await claimPendingCards("m1", " Ana@Mail.com ")).toBe(2);
    expect(findMany).toHaveBeenCalledWith({ where: { memberId: null, pendingOwnerEmail: "ana@mail.com" }, select: { id: true, programId: true } });
    expect(update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { memberId: "m1", pendingOwnerEmail: null } });
    expect(update).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0]).toMatchObject({ where: { memberId_programId: { memberId: "m1", programId: "p1" } }, create: { status: "active" } });
  });

  it("sin tarjetas pendientes devuelve 0", async () => {
    findMany.mockResolvedValue([]);
    expect(await claimPendingCards("m1", "x@y.com")).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});
