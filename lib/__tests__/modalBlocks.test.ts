import { describe, it, expect } from "vitest";
import { parseModalBlocks, parseModalBlocksMap, isEmbedVideoUrl, toEmbedVideoUrl, type ModalBlock } from "@/lib/modalBlocks";

const BLANK: Omit<ModalBlock, "id" | "kind"> = { heading: "", body: "", mediaUrl: "", mediaType: "video", linkLabel: "", kpiValue: "", kpiSub: "" };

describe("parseModalBlocks", () => {
  it("devuelve [] si no es un array", () => {
    expect(parseModalBlocks(null)).toEqual([]);
    expect(parseModalBlocks(undefined)).toEqual([]);
    expect(parseModalBlocks("no es un array")).toEqual([]);
  });

  it("descarta entradas que no son objetos", () => {
    expect(parseModalBlocks(["x", 5, null])).toEqual([]);
  });

  it("parsea un bloque de texto completo", () => {
    const result = parseModalBlocks([{ id: "abc", kind: "texto", heading: "Título", body: "Cuerpo" }]);
    expect(result).toEqual([{ id: "abc", kind: "texto", ...BLANK, heading: "Título", body: "Cuerpo" }]);
  });

  it("genera un id si falta o no es string", () => {
    const [a] = parseModalBlocks([{ kind: "texto" }]);
    expect(typeof a.id).toBe("string");
    expect(a.id.length).toBeGreaterThan(0);
    const [b] = parseModalBlocks([{ id: 5, kind: "texto" }]);
    expect(typeof b.id).toBe("string");
  });

  it("cae a kind:'texto' si el kind no es válido", () => {
    expect(parseModalBlocks([{ id: "x", kind: "lo_que_sea" }])).toEqual([{ id: "x", kind: "texto", ...BLANK }]);
    expect(parseModalBlocks([{ id: "x" }])).toEqual([{ id: "x", kind: "texto", ...BLANK }]);
  });

  it("acepta los 5 kinds válidos", () => {
    const kinds = ["texto", "imagen", "video_audio", "archivo_link", "kpi"];
    const result = parseModalBlocks(kinds.map((kind) => ({ id: kind, kind })));
    expect(result.map((b) => b.kind)).toEqual(kinds);
  });

  it("mediaType cae a 'video' salvo que sea exactamente 'audio'", () => {
    expect(parseModalBlocks([{ id: "x", kind: "video_audio", mediaType: "audio" }])[0].mediaType).toBe("audio");
    expect(parseModalBlocks([{ id: "x", kind: "video_audio", mediaType: "otracosa" }])[0].mediaType).toBe("video");
    expect(parseModalBlocks([{ id: "x", kind: "video_audio" }])[0].mediaType).toBe("video");
  });

  it("trata campos de texto que no son string como vacíos", () => {
    const result = parseModalBlocks([{ id: "x", kind: "kpi", heading: 5, body: null, mediaUrl: {}, linkLabel: [], kpiValue: 1, kpiSub: true }]);
    expect(result).toEqual([{ id: "x", kind: "kpi", ...BLANK }]);
  });

  it("parsea los campos de archivo_link y kpi cuando son strings", () => {
    const result = parseModalBlocks([
      { id: "x", kind: "archivo_link", linkLabel: "Abrir PDF" },
      { id: "y", kind: "kpi", kpiValue: "42", kpiSub: "miembros activos" },
    ]);
    expect(result).toEqual([
      { id: "x", kind: "archivo_link", ...BLANK, linkLabel: "Abrir PDF" },
      { id: "y", kind: "kpi", ...BLANK, kpiValue: "42", kpiSub: "miembros activos" },
    ]);
  });

  it("parsea varios bloques en orden", () => {
    const result = parseModalBlocks([
      { id: "1", kind: "texto", heading: "Uno" },
      { id: "2", kind: "imagen", mediaUrl: "https://img.example/a.png" },
    ]);
    expect(result.map((b) => b.id)).toEqual(["1", "2"]);
    expect(result[1].mediaUrl).toBe("https://img.example/a.png");
  });
});

describe("parseModalBlocksMap", () => {
  it("devuelve {} si no es un objeto, es null/undefined, o es un array", () => {
    expect(parseModalBlocksMap(null)).toEqual({});
    expect(parseModalBlocksMap(undefined)).toEqual({});
    expect(parseModalBlocksMap("no es un objeto")).toEqual({});
    expect(parseModalBlocksMap([{ id: "x", kind: "texto" }])).toEqual({});
  });

  it("parsea cada clave como su propio array de bloques", () => {
    const result = parseModalBlocksMap({
      vault: [{ id: "a", kind: "texto", heading: "Hola" }],
      cardInfo: [{ id: "b", kind: "kpi", kpiValue: "10" }],
    });
    expect(Object.keys(result).sort()).toEqual(["cardInfo", "vault"]);
    expect(result.vault[0].heading).toBe("Hola");
    expect(result.cardInfo[0].kpiValue).toBe("10");
  });

  it("omite claves cuyo valor parsea a un array vacío", () => {
    expect(parseModalBlocksMap({ info: [], vault: "no es un array" })).toEqual({});
  });
});

describe("isEmbedVideoUrl", () => {
  it("reconoce YouTube y Vimeo", () => {
    expect(isEmbedVideoUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isEmbedVideoUrl("https://youtu.be/abc123")).toBe(true);
    expect(isEmbedVideoUrl("https://vimeo.com/123456")).toBe(true);
  });

  it("no reconoce un archivo directo", () => {
    expect(isEmbedVideoUrl("https://example.com/video.mp4")).toBe(false);
  });
});

describe("toEmbedVideoUrl", () => {
  it("convierte un link de YouTube (watch?v=) a embed", () => {
    expect(toEmbedVideoUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("convierte un link corto youtu.be a embed", () => {
    expect(toEmbedVideoUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("convierte un link de Vimeo a embed", () => {
    expect(toEmbedVideoUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456");
  });

  it("devuelve la URL sin cambios si no matchea ningún patrón", () => {
    expect(toEmbedVideoUrl("https://example.com/video.mp4")).toBe("https://example.com/video.mp4");
  });
});
