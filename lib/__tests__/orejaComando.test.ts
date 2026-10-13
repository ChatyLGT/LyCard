import { describe, it, expect } from "vitest";
import { buildComando } from "../orejaComando";

const d = new Date("2026-10-13");

describe("buildComando", () => {
  it("devuelve ceros sin datos", () => {
    expect(buildComando("a", [], [])).toEqual({
      leadsLibres: 0, misLeads: 0, entrevistasAgendadas: 0, clientesCerrados: 0, clientesPagados: 0, comisionesUsd: 0,
    });
  });

  it("cuenta solo lo propio y suma comisiones de clientes vendidos por esta Oreja", () => {
    const r = buildComando(
      "a",
      [
        { claimedByAdminId: null, membership: null },
        { claimedByAdminId: "a", membership: { nextInterviewAt: d } },
        { claimedByAdminId: "a", membership: null },
        { claimedByAdminId: "b", membership: { nextInterviewAt: d } },
      ],
      [
        { status: "active", soldByAdminId: "a", membershipPaidAt: d, totalCommissionsUsd: 35 },
        { status: "invited", soldByAdminId: "a", membershipPaidAt: null, totalCommissionsUsd: 12 },
        { status: "active", soldByAdminId: "b", membershipPaidAt: d, totalCommissionsUsd: 99 },
      ]
    );
    expect(r).toEqual({ leadsLibres: 1, misLeads: 2, entrevistasAgendadas: 1, clientesCerrados: 1, clientesPagados: 1, comisionesUsd: 47 });
  });
});
