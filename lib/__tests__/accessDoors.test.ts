import { describe, expect, it } from "vitest";
import { ACCESS_DOORS, findAccessDoor, isValidPaymentModel } from "@/lib/accessDoors";

describe("findAccessDoor", () => {
  it("encuentra una puerta real por su key", () => {
    expect(findAccessDoor("arquitecto")?.precioDefault).toBe(500);
  });

  it("devuelve undefined para una key que no existe", () => {
    expect(findAccessDoor("no-existe")).toBeUndefined();
  });

  it("cubre las 8 puertas del menú", () => {
    expect(ACCESS_DOORS).toHaveLength(8);
  });
});

describe("isValidPaymentModel", () => {
  it("acepta un modelo de pago permitido para esa puerta", () => {
    expect(isValidPaymentModel("arquitecto", "cuotas")).toBe(true);
  });

  it("rechaza un modelo de pago no permitido para esa puerta", () => {
    expect(isValidPaymentModel("empezar", "cuotas")).toBe(false);
  });

  it("rechaza cuando la puerta no existe", () => {
    expect(isValidPaymentModel("no-existe", "unico")).toBe(false);
  });
});
