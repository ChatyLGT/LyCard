import { describe, it, expect } from "vitest";
import {
  parseProgramJson,
  planImport,
  stateFromRows,
  buildExport,
  describeChange,
  fieldLabel,
  canon,
  isSafeLink,
  isSafeAsset,
  findUnsafeUrls,
  PROGRAM_JSON_SCHEMA,
  MAX_PROGRAM_JSON_BYTES,
  type PlanContext,
  type NormalizedProgram,
} from "../programJson";

const rank = [
  { key: "curioso", nombre: "Curioso", subtitulo: "Ingreso", icono: "explore", color: "#8C7A55", descripcion: "d1" },
  { key: "padawan", nombre: "Padawan", subtitulo: "Formación", icono: "school", color: "#A88B4A", descripcion: "d2" },
];

function doc(over: Record<string, unknown> = {}) {
  return { schema: PROGRAM_JSON_SCHEMA, program: { name: "Legacy", slug: "legacy" }, ...over };
}
function parse(d: unknown) {
  return parseProgramJson(JSON.stringify(d));
}
function ok(d: unknown): NormalizedProgram {
  const r = parse(d);
  expect(r.errors).toEqual([]);
  expect(r.ok).toBe(true);
  return r.data as NormalizedProgram;
}
const baseCtx: PlanContext = {
  programs: [],
  current: null,
  existingCards: [],
  defaultTiers: { medal: ["oro", "plata"], rank: ["aprendiz", "maestro"], contacts: ["oro", "plata"] },
};

describe("helpers", () => {
  it("canon ordena claves y maneja undefined", () => {
    expect(canon({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}');
    expect(canon(undefined)).toBe("null");
    expect(canon(null)).toBe("null");
  });
  it("isSafeLink", () => {
    expect(isSafeLink("+5215512345678")).toBe(true);
    expect(isSafeLink("wa.me/123")).toBe(true);
    expect(isSafeLink("https://x.com/a")).toBe(true);
    expect(isSafeLink("MAILTO:a@b.co")).toBe(true);
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("data:text/html,x")).toBe(false);
  });
  it("isSafeAsset", () => {
    expect(isSafeAsset("")).toBe(true);
    expect(isSafeAsset("https://a.com/x.png")).toBe(true);
    expect(isSafeAsset("/uploads/x.png")).toBe(true);
    expect(isSafeAsset("//evil.com/x.png")).toBe(false);
    expect(isSafeAsset("http://a.com/x.png")).toBe(false);
    expect(isSafeAsset("javascript:1")).toBe(false);
  });
  it("findUnsafeUrls recorre listas y objetos", () => {
    const bad = findUnsafeUrls({ a: [{ iconUrl: "http://x" }, { mediaUrl: "https://ok" }], b: { href: "javascript:1", n: 3 } }, "p");
    expect(bad).toEqual(["p.a[0].iconUrl", "p.b.href"]);
  });
  it("fieldLabel traduce y cae al nombre crudo", () => {
    expect(fieldLabel("rankScale")).toBe("Escala de rangos");
    expect(fieldLabel("algoRaro")).toBe("algoRaro");
  });
});

describe("parseProgramJson: archivo", () => {
  it("rechaza vacío, inválido, demasiado grande y no-objeto", () => {
    expect(parseProgramJson("   ").errors[0].message).toMatch(/nada para validar/);
    expect(parseProgramJson("{no").errors[0].message).toMatch(/No es un JSON válido/);
    expect(parseProgramJson("x".repeat(MAX_PROGRAM_JSON_BYTES + 1)).errors[0].message).toMatch(/supera el máximo/);
    expect(parseProgramJson("[1]").errors[0].path).toBe("(raíz)");
    expect(parseProgramJson("[1]").data).toBeNull();
  });
  it("exige schema correcto y reporta claves desconocidas de la raíz", () => {
    const r = parse({ schema: "otra/9", program: { name: "A" }, extra: 1 });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.path === "schema")).toBe(true);
    expect(r.discarded).toEqual([{ path: "extra", reason: "Clave desconocida: se ignora." }]);
    expect(parse({ program: { name: "A" } }).errors[0].message).toMatch(/dice null/);
  });
  it("meta: objeto libre, no objeto, demasiado grande", () => {
    expect(ok(doc({ meta: { fuente: "mamen" } })).meta).toEqual({ fuente: "mamen" });
    expect(ok(doc()).meta).toEqual({});
    expect(parse(doc({ meta: [1] })).errors[0].path).toBe("meta");
    expect(parse(doc({ meta: { x: "y".repeat(9000) } })).errors[0].message).toMatch(/supera 8 KB/);
  });
});

describe("parseProgramJson: program", () => {
  it("program obligatorio y objeto", () => {
    expect(parse({ schema: PROGRAM_JSON_SCHEMA }).errors[0].path).toBe("program");
    expect(parse({ schema: PROGRAM_JSON_SCHEMA, program: [] }).errors[0].path).toBe("program");
  });
  it("nombre y slug", () => {
    expect(parse(doc({ program: {} })).errors.map((e) => e.path)).toContain("program.name");
    expect(parse(doc({ program: { name: "   " } })).errors.map((e) => e.path)).toContain("program.name");
    expect(parse(doc({ program: { name: 5 } })).errors.map((e) => e.path)).toContain("program.name");
    expect(parse(doc({ program: { name: "x".repeat(130) } })).errors[0].message).toMatch(/demasiado largo/);
    const d = ok(doc({ program: { name: "Consorcio MiPyME" } }));
    expect(d.program.slug).toBe("consorcio-mipyme");
    const r = parse(doc({ program: { name: "A", slug: "Mi Slug!" } }));
    expect(r.data?.program.slug).toBe("mi-slug");
    expect(r.warnings[0]).toMatch(/se normalizó/);
    expect(parse(doc({ program: { name: "A", slug: "!!!" } })).errors.map((e) => e.path)).toContain("program.slug");
    expect(ok(doc({ program: { name: "A", slug: "a" } })).program.slug).toBe("a");
  });
  it("origin: slug, null, inválido, ausente", () => {
    expect(ok(doc({ program: { name: "A", origin: "Legacy" } })).program).toMatchObject({ origin: "legacy", originProvided: true });
    expect(ok(doc({ program: { name: "A", origin: null } })).program).toMatchObject({ origin: null, originProvided: true });
    expect(ok(doc()).program.originProvided).toBe(false);
    expect(parse(doc({ program: { name: "A", origin: 3 } })).errors[0].path).toBe("program.origin");
    expect(parse(doc({ program: { name: "A", origin: "!!" } })).errors[0].path).toBe("program.origin");
  });
  it("escalares, color y logo", () => {
    const d = ok(doc({ program: { name: "A", cardAppName: " Legacy Card ", vaultTitle: "Bóveda Legacy", vaultPalabraSecreta: "x", primaryColor: "#C8A15A", logoUrl: "https://a.com/l.png" } }));
    expect(d.program.scalars).toEqual({ cardAppName: "Legacy Card", vaultTitle: "Bóveda Legacy", vaultPalabraSecreta: "x", primaryColor: "#C8A15A", logoUrl: "https://a.com/l.png" });
    const bad = parse(doc({ program: { name: "A", primaryColor: "dorado", cardAppName: 5 } }));
    expect(bad.ok).toBe(true);
    expect(bad.discarded.map((x) => x.path)).toEqual(["program.cardAppName", "program.primaryColor"]);
    expect(bad.data?.program.scalars).toEqual({});
    expect(ok(doc({ program: { name: "A", logoUrl: null } })).program.scalars.logoUrl).toBeNull();
    expect(ok(doc({ program: { name: "A", logoUrl: "" } })).program.scalars.logoUrl).toBeNull();
    expect(parse(doc({ program: { name: "A", logoUrl: "http://a.com/l.png" } })).errors[0].path).toBe("program.logoUrl");
    expect(parse(doc({ program: { name: "A", logoUrl: 7 } })).discarded[0].path).toBe("program.logoUrl");
  });
  it("social", () => {
    const d = ok(doc({ program: { name: "A", social: { wa: "+52155", ig: "@legacy", zzz: "1" } } }));
    expect(d.program.scalars).toMatchObject({ wa: "+52155", ig: "@legacy" });
    expect(parse(doc({ program: { name: "A", social: { zzz: "1" } } })).discarded[0].path).toBe("program.social.zzz");
    expect(parse(doc({ program: { name: "A", social: [] } })).errors[0].path).toBe("program.social");
    expect(parse(doc({ program: { name: "A", social: { web: "javascript:1" } } })).errors[0].path).toBe("program.social.web");
  });
  it("claves desconocidas de program", () => {
    expect(parse(doc({ program: { name: "A", isRoot: true } })).discarded[0]).toEqual({ path: "program.isRoot", reason: "Clave desconocida: se ignora." });
  });
});

describe("parseProgramJson: campos Json", () => {
  const p = (extra: Record<string, unknown>) => parse(doc({ program: { name: "A", ...extra } }));
  it("escalas válidas, con descartes y duplicados", () => {
    expect(p({ rankScale: rank }).data?.program.json.rankScale).toEqual(rank);
    const parc = p({ medalScale: [...rank, { key: "x" }, 5] });
    expect(parc.ok).toBe(true);
    expect(parc.discarded[0].path).toBe("program.medalScale");
    expect(parc.discarded[0].reason).toMatch(/2 de 4/);
    expect(p({ contactsScale: [rank[0], rank[0]] }).errors[0].message).toMatch(/repetidas: curioso/);
    expect(p({ rankScale: "x" }).errors[0].message).toMatch(/lista de niveles/);
    expect(p({ rankScale: Array.from({ length: 31 }, (_, i) => ({ nombre: `n${i}` })) }).errors[0].message).toMatch(/Máximo 30/);
  });
  it("officeSkills", () => {
    const s = { key: "a", nombre: "A", descripcion: "d", iconUrl: "https://x/i.png", color: "#fff", appType: "malla", enabled: true };
    expect(p({ officeSkills: [s] }).data?.program.json.officeSkills).toEqual([s]);
    expect(p({ officeSkills: [s, s] }).errors[0].message).toMatch(/repetidas/);
    expect(p({ officeSkills: [{ key: "" }] }).discarded[0].path).toBe("program.officeSkills");
    expect(p({ officeSkills: {} }).errors[0].path).toBe("program.officeSkills");
    expect(p({ officeSkills: Array.from({ length: 201 }, () => s) }).errors[0].message).toMatch(/Máximo 200/);
    expect(p({ officeSkills: [{ ...s, iconUrl: "http://x/i.png" }] }).errors[0].path).toBe("program.officeSkills[0].iconUrl");
  });
  it("motivationalPhrases", () => {
    expect(p({ motivationalPhrases: ["Hola", " "] }).data?.program.json.motivationalPhrases).toEqual(["Hola"]);
    expect(p({ motivationalPhrases: ["Hola", " "] }).discarded[0].path).toBe("program.motivationalPhrases");
    expect(p({ motivationalPhrases: "x" }).errors[0].path).toBe("program.motivationalPhrases");
    expect(p({ motivationalPhrases: Array.from({ length: 201 }, () => "a") }).errors[0].message).toMatch(/Máximo 200/);
    expect(p({ motivationalPhrases: ["a".repeat(301)] }).errors[0].message).toMatch(/300/);
  });
  it("podiumButtons", () => {
    const b = { slot: "left", kind: "info", aiTitle: "t", aiIcon: "i", aiBody: "b", aiPrompt: "p" };
    expect(p({ podiumButtons: [b] }).data?.program.json.podiumButtons).toEqual([b]);
    expect(p({ podiumButtons: [b, b] }).discarded[0].path).toBe("program.podiumButtons");
    expect(p({ podiumButtons: 1 }).errors[0].path).toBe("program.podiumButtons");
  });
  it("modalBlocks: ids determinísticos, descartes y URLs", () => {
    const blocks = { info: [{ kind: "texto", heading: "h", body: "b" }, { kind: "video", mediaUrl: "https://v/x.mp4" }] };
    const a = p({ modalBlocks: blocks }).data?.program.json.modalBlocks as Record<string, { id: string }[]>;
    const b = p({ modalBlocks: blocks }).data?.program.json.modalBlocks as Record<string, { id: string }[]>;
    expect(a.info.map((x) => x.id)).toEqual(["info-1", "info-2"]);
    expect(canon(a)).toBe(canon(b));
    expect(p({ modalBlocks: { info: [{ id: "mio", heading: "h" }] } }).data?.program.json.modalBlocks).toMatchObject({ info: [{ id: "mio" }] });
    expect(p({ modalBlocks: { info: [5] } }).discarded[0].path).toBe("program.modalBlocks.info");
    expect(p({ modalBlocks: { info: "no" } }).discarded[0].path).toBe("program.modalBlocks.info");
    expect(p({ modalBlocks: [] }).errors[0].path).toBe("program.modalBlocks");
    expect(p({ modalBlocks: { info: [{ kind: "video", mediaUrl: "http://v/x.mp4" }] } }).errors[0].path).toBe("program.modalBlocks.info[0].mediaUrl");
  });
  it("modalIcons, tierIntros y cardLabels", () => {
    expect(p({ modalIcons: { info: "info", x: "" } }).discarded[0].path).toBe("program.modalIcons.x");
    expect(p({ tierIntros: { od: "Hola" } }).data?.program.json.tierIntros).toEqual({ od: "Hola" });
    expect(p({ tierIntros: [] }).errors[0].path).toBe("program.tierIntros");
    expect(p({ modalIcons: 3 }).errors[0].path).toBe("program.modalIcons");
    const l = p({ cardLabels: { customize: " Editar ", "mala clave": "x", vacia: " ", num: 3, larga: "x".repeat(201) } });
    expect(l.data?.program.json.cardLabels).toEqual({ customize: "Editar" });
    expect(l.discarded.map((d) => d.path)).toEqual(["program.cardLabels.mala clave", "program.cardLabels.vacia", "program.cardLabels.num", "program.cardLabels.larga"]);
    expect(p({ cardLabels: [] }).errors[0].path).toBe("program.cardLabels");
  });
});

describe("parseProgramJson: puestos", () => {
  it("válidos, ausentes y errores", () => {
    const pu = [{ siglas: "O.D.", denominacion: "Orden", descripcion: "d", icono: "diamond", order: 0 }];
    expect(ok(doc({ puestos: pu })).puestos).toEqual(pu);
    expect(ok(doc()).puestos).toBeNull();
    expect(parse(doc({ puestos: {} })).errors[0].path).toBe("puestos");
    expect(parse(doc({ puestos: Array.from({ length: 61 }, (_, i) => ({ siglas: `s${i}`, denominacion: "d" })) })).errors[0].message).toMatch(/Máximo 60/);
    const parc = parse(doc({ puestos: [...pu, { siglas: "X" }, { siglas: "Y", denominacion: "d", otra: 1 }] }));
    expect(parc.discarded.map((d) => d.path)).toEqual(["puestos[2].otra", "puestos"]);
    expect(parse(doc({ puestos: [pu[0], pu[0]] })).errors[0].message).toMatch(/repetidas: O.D./);
    const largos = parse(doc({ puestos: [{ siglas: "s".repeat(21), denominacion: "d".repeat(81), descripcion: "x".repeat(401) }] }));
    expect(largos.errors.map((e) => e.path)).toEqual(["puestos[0].siglas", "puestos[0].denominacion", "puestos[0].descripcion"]);
  });
});

describe("parseProgramJson: tarjetas", () => {
  const c = (extra: Record<string, unknown> = {}) => parse(doc({ cards: [{ slug: "ana", name: "Ana", ...extra }] }));
  it("tarjeta mínima y completa", () => {
    expect(c().data?.cards).toEqual([{ slug: "ana", fields: { name: "Ana" } }]);
    const full = c({
      title: "T", quote: "Q", kind: "company", defaultTheme: "light", defaultLang: "en", medal: "oro", rank: "padawan", contacts: "plata",
      wa: "+52", email: "a@b.co", portraitUrl: "https://x/p.png", logoUrl: null, ownerEmail: " Ana@Mail.com ", puesto: " O.D. ",
    });
    expect(full.ok).toBe(true);
    expect(full.data?.cards?.[0]).toMatchObject({ ownerEmail: "ana@mail.com", puesto: "O.D.", fields: { kind: "company", logoUrl: null, portraitUrl: "https://x/p.png" } });
  });
  it("slug derivado, faltante y repetido", () => {
    expect(parse(doc({ cards: [{ name: "Ana Pérez" }] })).data?.cards?.[0].slug).toBe("ana-perez");
    expect(parse(doc({ cards: [{ title: "x" }] })).errors.map((e) => e.path)).toEqual(["cards[0].slug", "cards[0].name"]);
    expect(parse(doc({ cards: [{ slug: "a", name: "A" }, { slug: "a", name: "B" }] })).errors[0].message).toMatch(/repetidos: a/);
  });
  it("errores de campos", () => {
    expect(c({ email: "no" }).errors[0].path).toBe("cards[0].email");
    expect(c({ wa: "javascript:1" }).errors[0].path).toBe("cards[0].wa");
    expect(c({ portraitUrl: "http://x" }).errors[0].path).toBe("cards[0].portraitUrl");
    expect(c({ portraitUrl: 5 }).discarded[0].path).toBe("cards[0].portraitUrl");
    expect(c({ portraitUrl: "" }).data?.cards?.[0].fields.portraitUrl).toBeNull();
    expect(c({ kind: "otro" }).errors[0].message).toMatch(/Opciones: project, company, personal/);
    expect(c({ defaultTheme: "x" }).errors[0].path).toBe("cards[0].defaultTheme");
    expect(c({ ownerEmail: "mal" }).errors[0].path).toBe("cards[0].ownerEmail");
    expect(c({ ownerEmail: 4 }).errors[0].path).toBe("cards[0].ownerEmail");
    expect(c({ ownerEmail: null }).data?.cards?.[0].ownerEmail).toBeNull();
    expect(c({ ownerEmail: "" }).data?.cards?.[0].ownerEmail).toBeNull();
    expect(c({ puesto: 4 }).errors[0].path).toBe("cards[0].puesto");
    expect(c({ puesto: null }).data?.cards?.[0].puesto).toBeNull();
    expect(c({ puesto: "" }).data?.cards?.[0].puesto).toBeNull();
    expect(c({ extra: 1 }).discarded[0].path).toBe("cards[0].extra");
    expect(c({ name: "x".repeat(121) }).errors.some((e) => /demasiado largo/.test(e.message))).toBe(true);
  });
  it("cards inválidas: no lista, no objeto, demasiadas", () => {
    expect(parse(doc({ cards: {} })).errors[0].path).toBe("cards");
    expect(parse(doc({ cards: [5] })).errors[0].path).toBe("cards[0]");
    expect(parse(doc({ cards: Array.from({ length: 501 }, (_, i) => ({ slug: `c${i}`, name: "n" })) })).errors[0].message).toMatch(/Máximo 500/);
    expect(ok(doc()).cards).toBeNull();
  });
});

describe("planImport", () => {
  const legacyState = stateFromRows(
    { name: "Legacy", slug: "legacy", cardAppName: "Legacy Card", primaryColor: "#C8A15A", wa: "+52", rankScale: rank, medalScale: [], contactsScale: [] },
    null,
    [{ siglas: "O.D.", denominacion: "Orden", descripcion: "", icono: "diamond", order: 0 }, { siglas: "SH", denominacion: "Sherpa", descripcion: "", icono: "terrain", order: 1 }],
    [{ slug: "ana", name: "Ana", title: "T", rank: "padawan", puestoSiglas: "O.D.", ownerEmail: "ana@mail.com" }, { slug: "bruno", name: "Bruno" }]
  );
  const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
    ...baseCtx,
    programs: [{ slug: "legacy", originSlug: null }],
    current: legacyState,
    existingCards: [{ slug: "ana", programSlug: "legacy", ownerEmail: "ana@mail.com" }, { slug: "bruno", programSlug: "legacy", ownerEmail: "" }],
    ...over,
  });

  it("crear raíz sin programas existentes", () => {
    const p = planImport(ok(doc({ program: { name: "Legacy", rankScale: rank }, puestos: [{ siglas: "A", denominacion: "d" }], cards: [{ slug: "x", name: "X", rank: "padawan" }] })), { ...baseCtx });
    expect(p.ok).toBe(true);
    expect(p.programAction).toBe("crear");
    expect(p.counts).toMatchObject({ puestosNuevos: 1, tarjetasNuevas: 1 });
    const w = p.writes.cards[0];
    expect(w.isNew).toBe(true);
    expect(w.data).toMatchObject({ rank: "padawan", medal: "oro", contacts: "oro", title: "", quote: "" });
  });
  it("programa nuevo sin origen cuando ya hay programas -> error; con origen válido -> ok", () => {
    const sin = planImport(ok(doc({ program: { name: "Nuevo" } })), { ...baseCtx, programs: [{ slug: "legacy", originSlug: null }] });
    expect(sin.ok).toBe(false);
    expect(sin.errors[0].path).toBe("program.origin");
    const con = planImport(ok(doc({ program: { name: "Nuevo", origin: "legacy" } })), { ...baseCtx, programs: [{ slug: "legacy", originSlug: null }] });
    expect(con.ok).toBe(true);
    expect(con.writes.program).toMatchObject({ create: true, originSlug: "legacy", originProvided: true });
  });
  it("origen inexistente y ciclo", () => {
    const no = planImport(ok(doc({ program: { name: "N", origin: "fantasma" } })), { ...baseCtx, programs: [{ slug: "legacy", originSlug: null }] });
    expect(no.errors[0].message).toMatch(/no existe/);
    const self = planImport(ok(doc({ program: { name: "L", slug: "legacy", origin: "legacy" } })), ctx());
    expect(self.errors[0].message).toMatch(/ciclo/);
    const cyc = planImport(ok(doc({ program: { name: "L", slug: "legacy", origin: "hijo" } })), ctx({ programs: [{ slug: "legacy", originSlug: null }, { slug: "hijo", originSlug: "legacy" }] }));
    expect(cyc.errors[0].message).toMatch(/ciclo/);
  });
  it("actualizar: cambios, sin cambios y conservados", () => {
    const p = planImport(
      ok(doc({
        program: { name: "Legacy", slug: "legacy", cardAppName: "Legacy Card", primaryColor: "#000000", social: { wa: "+53" } },
        puestos: [{ siglas: "O.D.", denominacion: "Orden de Distinción", icono: "diamond", order: 0 }, { siglas: "NUEVO", denominacion: "N" }],
        cards: [{ slug: "ana", name: "Ana", rank: "curioso", puesto: "NUEVO", ownerEmail: "ana@mail.com" }, { slug: "bruno", name: "Bruno" }, { slug: "carla", name: "Carla" }],
      })),
      ctx()
    );
    expect(p.ok).toBe(true);
    expect(p.programAction).toBe("actualizar");
    expect(p.counts).toEqual({ puestosNuevos: 1, puestosCambian: 1, puestosConservados: 1, tarjetasNuevas: 1, tarjetasCambian: 1, tarjetasIguales: 1, tarjetasConservadas: 0 });
    const prog = p.changes[0];
    expect(prog.kind).toBe("cambia");
    expect(prog.fields.map((f) => f.field).sort()).toEqual(["primaryColor", "wa"]);
    expect(p.changes.find((c) => c.target === "ana")?.fields.map((f) => f.field).sort()).toEqual(["puesto", "rank"]);
    expect(p.changes.find((c) => c.target === "bruno")?.kind).toBe("igual");
  });
  it("actualizar con todo igual y cambio de origen", () => {
    const igual = planImport(ok(doc({ program: { name: "Legacy", slug: "legacy" } })), ctx());
    expect(igual.changes[0].kind).toBe("igual");
    const otro = planImport(ok(doc({ program: { name: "Legacy", slug: "legacy", origin: null } })), ctx());
    expect(otro.changes[0].kind).toBe("igual");
    const base = ctx({ programs: [{ slug: "legacy", originSlug: null }, { slug: "madre", originSlug: null }] });
    const cambia = planImport(ok(doc({ program: { name: "Legacy", slug: "legacy", origin: "madre" } })), base);
    expect(cambia.ok).toBe(true);
    expect(cambia.changes[0].fields[0]).toEqual({ field: "origin", before: null, after: "madre" });
  });
  it("tarjetas conservadas y owner ausente en la tarjeta existente", () => {
    const p = planImport(ok(doc({ cards: [{ slug: "bruno", name: "Bruno", ownerEmail: "bruno@mail.com", puesto: null }] })), ctx());
    expect(p.ok).toBe(true);
    expect(p.counts.tarjetasConservadas).toBe(1);
    expect(p.changes.find((c) => c.target === "bruno")?.fields.map((f) => f.field)).toEqual(["ownerEmail"]);
    expect(p.writes.cards[0]).toMatchObject({ ownerEmail: "bruno@mail.com", puesto: null });
  });
  it("errores de tarjetas: otro programa, escala, puesto y dueño", () => {
    const p = planImport(
      ok(doc({ cards: [{ slug: "ana", name: "Ana", ownerEmail: "otra@mail.com", rank: "dios", puesto: "ZZZ" }, { slug: "ajena", name: "Ajena", medal: "uranio" }, { slug: "huerfana", name: "H" }] })),
      ctx({ existingCards: [{ slug: "ana", programSlug: "legacy", ownerEmail: "ana@mail.com" }, { slug: "ajena", programSlug: "otro", ownerEmail: "" }, { slug: "huerfana", programSlug: null, ownerEmail: "" }] })
    );
    expect(p.ok).toBe(false);
    const msgs = p.errors.map((e) => e.message).join("\n");
    expect(msgs).toMatch(/ya tiene dueño/);
    expect(msgs).toMatch(/escala de rangos/);
    expect(msgs).toMatch(/puesto "ZZZ"/);
    expect(msgs).toMatch(/ya existe en otro Programa \(otro\)/);
    expect(msgs).toMatch(/escala de medallas/);
    expect(msgs).toMatch(/ya existe en otro Programa\./);
  });
  it("escalas efectivas: del JSON, del actual o por defecto; contactos", () => {
    const p = planImport(ok(doc({ program: { name: "L", slug: "legacy", medalScale: [], contactsScale: [rank[0]] }, cards: [{ slug: "z", name: "Z", medal: "oro", contacts: "curioso" }] })), ctx());
    expect(p.ok).toBe(true);
    const e = planImport(ok(doc({ cards: [{ slug: "z", name: "Z", contacts: "nada" }] })), ctx());
    expect(e.errors[0].message).toMatch(/contactos/);
  });
  it("sin tarjetas ni puestos en el JSON todo se conserva", () => {
    const p = planImport(ok(doc()), ctx());
    expect(p.counts).toMatchObject({ puestosConservados: 2, tarjetasConservadas: 2 });
  });
  it("tarjeta nueva en programa nuevo sin escalas usa defaults vacíos", () => {
    const p = planImport(ok(doc({ cards: [{ slug: "z", name: "Z" }] })), { ...baseCtx, defaultTiers: { medal: [], rank: [], contacts: [] } });
    expect(p.writes.cards[0].data).toEqual({ name: "Z", title: "", quote: "" });
  });
});

describe("export y textos", () => {
  it("stateFromRows aplica defaults y buildExport arma el documento", () => {
    const s = stateFromRows({ name: "P", slug: "p" }, "legacy", [{ siglas: "B", denominacion: "b", descripcion: "", icono: "diamond", order: 2 }, { siglas: "A", denominacion: "a", descripcion: "", icono: "diamond", order: 2 }], [{ slug: "c", name: "C", logoUrl: "https://x/l.png", kind: "company", defaultTheme: "light", defaultLang: "en" }, { slug: "d", name: "D" }]);
    expect(s.program).toMatchObject({ origin: "legacy", logoUrl: null, cardAppName: "", social: { wa: "" }, cardLabels: {}, rankScale: [], modalBlocks: {} });
    expect(s.puestos.map((p) => p.siglas)).toEqual(["A", "B"]);
    expect(s.cards[0]).toMatchObject({ kind: "company", defaultTheme: "light", defaultLang: "en", logoUrl: "https://x/l.png", puesto: null, ownerEmail: "" });
    expect(s.cards[1]).toMatchObject({ kind: "project", defaultTheme: "dark", defaultLang: "es", portraitUrl: null });
    const out = buildExport(s, { a: 1 });
    expect(out.schema).toBe(PROGRAM_JSON_SCHEMA);
    expect(out.meta).toEqual({ a: 1 });
    expect(buildExport(s).meta).toEqual({});
  });
  it("ida y vuelta: exportar -> validar -> plan sin cambios", () => {
    const s = stateFromRows(
      { name: "Legacy", slug: "legacy", cardAppName: "Legacy Card", primaryColor: "#C8A15A", vaultTitle: "Bóveda Legacy", rankScale: rank, medalScale: [], contactsScale: [], cardLabels: { customize: "Editar" }, modalBlocks: { info: [{ id: "info-1", kind: "texto", heading: "h", body: "b", mediaUrl: "", mediaType: "video", linkLabel: "", kpiValue: "", kpiSub: "" }] } },
      null,
      [{ siglas: "O.D.", denominacion: "Orden", descripcion: "d", icono: "diamond", order: 0 }],
      [{ slug: "ana", name: "Ana", title: "T", quote: "Q", rank: "padawan", medal: "oro", contacts: "plata", puestoSiglas: "O.D.", ownerEmail: "ana@mail.com" }]
    );
    const r = parseProgramJson(JSON.stringify(buildExport(s)));
    expect(r.errors).toEqual([]);
    const plan = planImport(r.data as NormalizedProgram, { ...baseCtx, programs: [{ slug: "legacy", originSlug: null }], current: s, existingCards: [{ slug: "ana", programSlug: "legacy", ownerEmail: "ana@mail.com" }] });
    expect(plan.errors).toEqual([]);
    expect(plan.changes.filter((c) => c.kind !== "igual")).toEqual([]);
  });
  it("describeChange en español", () => {
    expect(describeChange({ scope: "programa", target: "p", kind: "nuevo", fields: [] })).toBe("Programa p: se crea.");
    expect(describeChange({ scope: "puesto", target: "A", kind: "igual", fields: [] })).toBe("Puesto A: sin cambios.");
    const t = describeChange({ scope: "tarjeta", target: "ana", kind: "cambia", fields: [
      { field: "rank", before: "a", after: "b" },
      { field: "rankScale", before: [1], after: [1, 2] },
      { field: "cardLabels", before: {}, after: { a: "1", b: "2" } },
      { field: "title", before: "", after: "x".repeat(80) },
      { field: "quote", before: null, after: { a: 1 } },
    ] });
    expect(t).toContain('Rango: "a" → "b"');
    expect(t).toContain("Escala de rangos: 1 elemento → 2 elementos");
    expect(t).toContain("Textos de botones y modales: 0 claves → 2 claves");
    expect(t).toContain('(vacío) → "' + "x".repeat(57) + '..."');
    expect(t).toContain("(vacío) → 1 clave.");
  });
});
