import { describe, it, expect } from "vitest";
import {
  parseBautizoStatus,
  parseConsultaNivel,
  parseRango,
  parseExperiencia,
  parseEspecialidades,
  canPublishExperto,
  shouldRequireRegistration,
  matchCodiceEntry,
  FREE_TRIAL_LIMIT,
  EXAMPLE_EXPERTO,
  EXAMPLE_EXPERTO_EQUIPO,
} from "@/lib/expertos";

describe("parseBautizoStatus", () => {
  it("acepta los 2 estados válidos", () => {
    expect(parseBautizoStatus("sin_bautizar")).toBe("sin_bautizar");
    expect(parseBautizoStatus("bautizado")).toBe("bautizado");
  });

  it("cualquier otra cosa cae a 'sin_bautizar' -- default seguro, nunca publicado por accidente", () => {
    expect(parseBautizoStatus("publicado")).toBe("sin_bautizar");
    expect(parseBautizoStatus(undefined)).toBe("sin_bautizar");
  });
});

describe("parseConsultaNivel", () => {
  it("acepta los 3 niveles válidos", () => {
    expect(parseConsultaNivel("gemelo_solo")).toBe("gemelo_solo");
    expect(parseConsultaNivel("gemelo_revisado")).toBe("gemelo_revisado");
    expect(parseConsultaNivel("sesion")).toBe("sesion");
  });

  it("cualquier otra cosa cae a 'gemelo_solo'", () => {
    expect(parseConsultaNivel("otro")).toBe("gemelo_solo");
    expect(parseConsultaNivel(null)).toBe("gemelo_solo");
  });
});

describe("canPublishExperto", () => {
  it("necesita consentimiento dado, no revocado, y Bautizo hecho -- las 3 juntas", () => {
    expect(
      canPublishExperto({ consentGivenAt: new Date(), consentRevokedAt: null, bautizoStatus: "bautizado" })
    ).toBe(true);
  });

  it("sin consentimiento no publica, aunque diga bautizado", () => {
    expect(canPublishExperto({ consentGivenAt: null, consentRevokedAt: null, bautizoStatus: "bautizado" })).toBe(false);
  });

  it("consentimiento revocado no publica, aunque lo haya dado antes", () => {
    expect(canPublishExperto({ consentGivenAt: new Date(), consentRevokedAt: new Date(), bautizoStatus: "bautizado" })).toBe(false);
  });

  it("sin Bautizo no publica, aunque haya consentimiento vigente", () => {
    expect(canPublishExperto({ consentGivenAt: new Date(), consentRevokedAt: null, bautizoStatus: "sin_bautizar" })).toBe(false);
  });
});

describe("shouldRequireRegistration", () => {
  it("las primeras 3 preguntas son gratis, sin pedir registro", () => {
    expect(shouldRequireRegistration(0)).toBe(false);
    expect(shouldRequireRegistration(1)).toBe(false);
    expect(shouldRequireRegistration(FREE_TRIAL_LIMIT - 1)).toBe(false);
  });

  it("a partir de la 4ta (conteo ya en 3) pide registro", () => {
    expect(shouldRequireRegistration(FREE_TRIAL_LIMIT)).toBe(true);
    expect(shouldRequireRegistration(FREE_TRIAL_LIMIT + 5)).toBe(true);
  });
});

describe("matchCodiceEntry", () => {
  const codice = [
    { pregunta: "¿Qué desayuno me conviene antes de entrenar?", respuesta: "Respuesta A", aprobadaAt: new Date() },
    { pregunta: "¿Cuánta agua tomar en verano?", respuesta: "Respuesta B", aprobadaAt: null },
  ];

  it("matchea por palabra compartida (4+ letras) con una entrada APROBADA", () => {
    expect(matchCodiceEntry("¿Qué me conviene desayunar antes de correr?", codice)).toBe("Respuesta A");
  });

  it("ignora entradas todavía no aprobadas, aunque compartan palabras", () => {
    expect(matchCodiceEntry("¿Cuánta agua es mucha?", codice)).toBeNull();
  });

  it("sin ninguna palabra significativa en la pregunta, no matchea nada", () => {
    expect(matchCodiceEntry("a b c", codice)).toBeNull();
  });

  it("sin match real, devuelve null", () => {
    expect(matchCodiceEntry("¿Cuál es tu color favorito?", codice)).toBeNull();
  });

  it("acentos no rompen el match (normaliza antes de comparar)", () => {
    expect(matchCodiceEntry("Que desayuno conviene antes de entrenar", codice)).toBe("Respuesta A");
  });
});

describe("EXAMPLE_EXPERTO", () => {
  it("está marcado como ejemplo en su propio nombre", () => {
    expect(EXAMPLE_EXPERTO.nombrePublico).toContain("ejemplo");
  });

  it("es una profesión regulada, con al menos una entrada de Códice sembrada", () => {
    expect(EXAMPLE_EXPERTO.esProfesionRegulada).toBe(true);
    expect(EXAMPLE_EXPERTO.seedCodice.length).toBeGreaterThan(0);
  });

  it("tiene CV real -- experiencia y especialidades", () => {
    expect(EXAMPLE_EXPERTO.experiencia.length).toBeGreaterThan(0);
    expect(EXAMPLE_EXPERTO.especialidades.length).toBeGreaterThan(0);
  });
});

describe("EXAMPLE_EXPERTO_EQUIPO", () => {
  it("son 3 Legacy de ejemplo, marcados como tal", () => {
    expect(EXAMPLE_EXPERTO_EQUIPO.length).toBe(3);
    for (const miembro of EXAMPLE_EXPERTO_EQUIPO) {
      expect(miembro.demoMemberName).toContain("ejemplo");
    }
  });
});

describe("parseRango", () => {
  it("acepta los 2 rangos válidos", () => {
    expect(parseRango("especialista")).toBe("especialista");
    expect(parseRango("experto")).toBe("experto");
  });

  it("cualquier otra cosa cae a 'especialista' -- default seguro, nunca experto por accidente", () => {
    expect(parseRango("jefe")).toBe("especialista");
    expect(parseRango(undefined)).toBe("especialista");
  });
});

describe("parseExperiencia", () => {
  it("filtra items con rol vacío y descarta lo que no sea objeto", () => {
    expect(
      parseExperiencia([
        { rol: "Nutricionista", periodo: "2019-hoy", descripcion: "x" },
        { rol: "", periodo: "2015", descripcion: "sin rol, se descarta" },
        "no es objeto",
        null,
      ])
    ).toEqual([{ rol: "Nutricionista", periodo: "2019-hoy", descripcion: "x" }]);
  });

  it("completa periodo/descripcion vacíos cuando faltan o no son strings", () => {
    expect(parseExperiencia([{ rol: "Nutricionista", periodo: 2019, descripcion: null }])).toEqual([
      { rol: "Nutricionista", periodo: "", descripcion: "" },
    ]);
  });

  it("un rol que no es string cae a vacío, y se descarta igual que un rol realmente vacío", () => {
    expect(parseExperiencia([{ rol: 123, periodo: "2019", descripcion: "x" }])).toEqual([]);
  });

  it("algo que no es array da lista vacía", () => {
    expect(parseExperiencia(undefined)).toEqual([]);
    expect(parseExperiencia("texto")).toEqual([]);
  });
});

describe("parseEspecialidades", () => {
  it("filtra solo strings no vacíos", () => {
    expect(parseEspecialidades(["Nutrición", "", 42, "Hidratación"])).toEqual(["Nutrición", "Hidratación"]);
  });

  it("algo que no es array da lista vacía", () => {
    expect(parseEspecialidades(null)).toEqual([]);
  });
});
