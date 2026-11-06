import { it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseProgramJson } from "@/lib/programJson";
it("el ejemplo de docs valida", () => {
  const r = parseProgramJson(readFileSync("docs/ejemplos/legacy.program.json", "utf8"));
  expect(r.errors).toEqual([]);
  expect(r.discarded).toEqual([]);
});
