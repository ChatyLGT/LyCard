import { describe, it, expect } from "vitest";
import { groupThreadsByMemberId, type ChatDeliveryRow } from "../chatThreads";

function row(partial: Partial<ChatDeliveryRow["message"]> & { recipientMemberId?: string | null }): ChatDeliveryRow {
  return {
    recipientMemberId: partial.recipientMemberId ?? null,
    message: {
      id: partial.id ?? "msg-1",
      body: partial.body ?? "hola",
      createdAt: partial.createdAt ?? new Date("2026-01-01T00:00:00Z"),
      senderMemberId: partial.senderMemberId ?? null,
      senderAdminId: partial.senderAdminId ?? null,
    },
  };
}

describe("groupThreadsByMemberId", () => {
  it("groups a message sent BY the admin by its recipientMemberId", () => {
    const threads = groupThreadsByMemberId([
      row({ id: "m1", recipientMemberId: "member-1", senderAdminId: "admin-1", body: "hola lead" }),
    ]);
    expect(threads.get("member-1")).toEqual([{ id: "m1", body: "hola lead", createdAt: new Date("2026-01-01T00:00:00Z"), fromAdmin: true }]);
  });

  it("groups a message sent BY the member by its senderMemberId, ignoring recipientMemberId", () => {
    const threads = groupThreadsByMemberId([
      row({ id: "m2", senderMemberId: "member-1", recipientMemberId: null, body: "hola oreja" }),
    ]);
    expect(threads.get("member-1")).toEqual([{ id: "m2", body: "hola oreja", createdAt: new Date("2026-01-01T00:00:00Z"), fromAdmin: false }]);
  });

  it("merges both directions into one thread per member, sorted chronologically", () => {
    const threads = groupThreadsByMemberId([
      row({ id: "m2", senderMemberId: "member-1", createdAt: new Date("2026-01-01T00:10:00Z"), body: "respuesta del lead" }),
      row({ id: "m1", recipientMemberId: "member-1", senderAdminId: "admin-1", createdAt: new Date("2026-01-01T00:00:00Z"), body: "hola lead" }),
    ]);
    expect(threads.get("member-1")?.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("keeps separate leads in separate threads", () => {
    const threads = groupThreadsByMemberId([
      row({ id: "m1", recipientMemberId: "member-1", senderAdminId: "admin-1" }),
      row({ id: "m2", recipientMemberId: "member-2", senderAdminId: "admin-1" }),
    ]);
    expect(threads.size).toBe(2);
    expect(threads.get("member-1")?.map((m) => m.id)).toEqual(["m1"]);
    expect(threads.get("member-2")?.map((m) => m.id)).toEqual(["m2"]);
  });

  it("drops a row with no identifiable partner (defensive, should never happen in practice)", () => {
    const threads = groupThreadsByMemberId([row({ id: "m1", recipientMemberId: null, senderMemberId: null })]);
    expect(threads.size).toBe(0);
  });
});
