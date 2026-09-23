import { describe, expect, it } from "vitest";
import {
  CARD_SIZE_KEYS,
  SIZE_MIN,
  SIZE_MAX,
  defaultCardSizeConfig,
  parseCardSizeConfig,
  buildCardSizeCssVars,
} from "../cardSizeConfig";

describe("defaultCardSizeConfig", () => {
  it("los 4 módulos arrancan en 1 (100%)", () => {
    const config = defaultCardSizeConfig();
    for (const key of CARD_SIZE_KEYS) {
      expect(config[key]).toBe(1);
    }
  });
});

describe("parseCardSizeConfig", () => {
  it("acepta valores reales dentro de rango", () => {
    const config = parseCardSizeConfig({ photo: 0.8, qrBtn: 1.2 });
    expect(config.photo).toBe(0.8);
    expect(config.qrBtn).toBe(1.2);
    expect(config.cubeMedium).toBe(1); // no vino en el JSON -- default
  });

  it("clampea un valor por encima del máximo", () => {
    const config = parseCardSizeConfig({ photo: 5 });
    expect(config.photo).toBe(SIZE_MAX);
  });

  it("clampea un valor por debajo del mínimo", () => {
    const config = parseCardSizeConfig({ photo: -3 });
    expect(config.photo).toBe(SIZE_MIN);
  });

  it("ignora un valor no numérico y cae al default", () => {
    const config = parseCardSizeConfig({ photo: "grande" });
    expect(config.photo).toBe(1);
  });

  it("ignora keys desconocidas sin romper", () => {
    const config = parseCardSizeConfig({ photo: 0.9, algoInventado: 99 });
    expect(config.photo).toBe(0.9);
    expect(Object.keys(config).sort()).toEqual([...CARD_SIZE_KEYS].sort());
  });

  it("un valor NaN/Infinity nunca es finito -- cae al default, no se clampea", () => {
    const config = parseCardSizeConfig({ photo: NaN, qrBtn: Infinity });
    expect(config.photo).toBe(1);
    expect(config.qrBtn).toBe(1);
  });

  it("null, undefined, array o string -- todo cae al default completo", () => {
    expect(parseCardSizeConfig(null)).toEqual(defaultCardSizeConfig());
    expect(parseCardSizeConfig(undefined)).toEqual(defaultCardSizeConfig());
    expect(parseCardSizeConfig([1, 2, 3])).toEqual(defaultCardSizeConfig());
    expect(parseCardSizeConfig("no-es-un-objeto")).toEqual(defaultCardSizeConfig());
  });
});

describe("buildCardSizeCssVars", () => {
  it("arma una variable --scale-<key> por cada módulo, con 2 decimales", () => {
    const vars = buildCardSizeCssVars({ photo: 0.85, qrBtn: 1.1, cubeMedium: 1, socialIcon: 1.333 });
    expect(vars["--scale-photo"]).toBe("0.85");
    expect(vars["--scale-qrBtn"]).toBe("1.10");
    expect(vars["--scale-cubeMedium"]).toBe("1.00");
    expect(vars["--scale-socialIcon"]).toBe("1.33");
  });

  it("clampea también acá -- nunca deja pasar un valor fuera de rango al CSS", () => {
    const vars = buildCardSizeCssVars({ photo: 99, qrBtn: -5, cubeMedium: 1, socialIcon: 1 });
    expect(vars["--scale-photo"]).toBe(SIZE_MAX.toFixed(2));
    expect(vars["--scale-qrBtn"]).toBe(SIZE_MIN.toFixed(2));
  });
});
