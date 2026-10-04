import { describe, it, expect } from "vitest";
import { parseAiAgentResponse } from "@/lib/aiAgent";

describe("parseAiAgentResponse", () => {
  it("parsea un JSON válido directo", () => {
    expect(parseAiAgentResponse('{"title":"Calculadora","icon":"calculate","body":"desc"}')).toEqual({
      title: "Calculadora",
      icon: "calculate",
      body: "desc",
    });
  });

  it("rescata el JSON si viene envuelto en texto/backticks", () => {
    const raw = 'Acá tenés:\n```json\n{"title":"Calculadora","icon":"calculate","body":"desc"}\n```\nListo.';
    expect(parseAiAgentResponse(raw)).toEqual({ title: "Calculadora", icon: "calculate", body: "desc" });
  });

  it("devuelve null si no hay ningún objeto JSON", () => {
    expect(parseAiAgentResponse("esto no es json en absoluto")).toBeNull();
  });

  it("devuelve null si no hay ninguna llave que abra y cierre", () => {
    expect(parseAiAgentResponse("texto { no cierra bien")).toBeNull();
  });

  it("devuelve null si el objeto rescatado (con llaves) tampoco es JSON válido", () => {
    expect(parseAiAgentResponse("resultado: {title: sin_comillas, roto} fin")).toBeNull();
  });

  it("devuelve null si el JSON válido no es un objeto", () => {
    expect(parseAiAgentResponse("[1,2,3]")).toBeNull();
    expect(parseAiAgentResponse("null")).toBeNull();
  });

  it("devuelve null si falta alguna clave requerida", () => {
    expect(parseAiAgentResponse('{"title":"x","icon":"calculate"}')).toBeNull();
    expect(parseAiAgentResponse('{"icon":"calculate","body":"desc"}')).toBeNull();
    expect(parseAiAgentResponse('{"title":"x","body":"desc"}')).toBeNull();
  });

  it("descarta claves que no son string", () => {
    expect(parseAiAgentResponse('{"title":5,"icon":"calculate","body":"desc"}')).toBeNull();
  });

  it("recorta title a 40 caracteres y body a 600", () => {
    const longTitle = "x".repeat(60);
    const longBody = "y".repeat(700);
    const result = parseAiAgentResponse(JSON.stringify({ title: longTitle, icon: "calculate", body: longBody }));
    expect(result?.title.length).toBe(40);
    expect(result?.body.length).toBe(600);
  });

  it("recorta espacios en los 3 campos", () => {
    expect(parseAiAgentResponse('{"title":"  Calculadora  ","icon":"  calculate  ","body":"  desc  "}')).toEqual({
      title: "Calculadora",
      icon: "calculate",
      body: "desc",
    });
  });

  it("devuelve null si algún campo queda vacío después de recortar espacios", () => {
    expect(parseAiAgentResponse('{"title":"   ","icon":"calculate","body":"desc"}')).toBeNull();
  });
});
