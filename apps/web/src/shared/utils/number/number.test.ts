import { describe, expect, it } from "vitest";
import { average, sum, sumBy } from "./aggregates";
import { calcPercentage } from "./calc-percentage";
import { clamp } from "./clamp";
import { formatNumber } from "./format-number";
import { numberToWords } from "./number-to-words";
import { ordinal } from "./ordinal";
import { round } from "./round";
import { toFixedSafe } from "./to-fixed-safe";

const NBSP = "\u00A0";

describe("formatNumber", () => {
  it("formata com locale pt-AO por omissão", () => {
    expect(formatNumber(1000)).toBe(`1${NBSP}000`);
    expect(formatNumber(1234.5)).toBe(`1${NBSP}234,5`);
  });

  it("respeita min/max fraction digits", () => {
    expect(formatNumber(1000.5, { minFractionDigits: 2 })).toBe(`1${NBSP}000,50`);
    expect(formatNumber(1.234567, { maxFractionDigits: 2 })).toBe("1,23");
  });

  it("usa o locale fornecido", () => {
    expect(formatNumber(1234.5, {}, "en-US")).toBe("1,234.5");
  });

  it("suporta options do Intl (notation compact)", () => {
    expect(formatNumber(12_000_000, { notation: "compact", maximumFractionDigits: 1 })).toBe(
      `12${NBSP}M`,
    );
  });
});

describe("aggregates", () => {
  it("sum ignora não-números e strings inválidas", () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum(["1", "2,5", null, undefined, "abc"])).toBe(1);
    expect(sum([])).toBe(0);
  });

  it("average ignora strings e vazios", () => {
    expect(average([2, 4])).toBe(3);
    expect(average([])).toBe(0);
    expect(average([1, "a", null])).toBe(1);
  });

  it("sumBy usa getter", () => {
    const items = [{ v: 1 }, { v: 2 }, { v: 3 }];
    expect(sumBy(items, (i) => i.v)).toBe(6);
    expect(sumBy(items, () => NaN)).toBe(0);
    expect(sumBy([], () => 1)).toBe(0);
  });
});

describe("calcPercentage", () => {
  it("calcula percentagem", () => {
    expect(calcPercentage(50, 200)).toBe("25.0");
    expect(calcPercentage(1, 3, 2)).toBe("33.33");
  });

  it("total zero devolve 0.0", () => {
    expect(calcPercentage(50, 0)).toBe("0.0");
  });
});

describe("clamp", () => {
  it("limita inferior e superiormente", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("troca min/max invertidos", () => {
    expect(clamp(50, 100, 0)).toBe(50);
    expect(clamp(150, 100, 0)).toBe(100);
  });
});

describe("numberToWords", () => {
  it("unidades e dezenas", () => {
    expect(numberToWords(0)).toBe("zero");
    expect(numberToWords(7)).toBe("sete");
    expect(numberToWords(15)).toBe("quinze");
    expect(numberToWords(42)).toBe("quarenta e dois");
  });

  it("centenas", () => {
    expect(numberToWords(100)).toBe("cem");
    expect(numberToWords(101)).toBe("cento e um");
    expect(numberToWords(250)).toBe("duzentos e cinquenta");
  });

  it("milhares", () => {
    expect(numberToWords(1000)).toBe("mil");
    expect(numberToWords(1500)).toBe("mil quinhentos");
    expect(numberToWords(2000)).toBe("dois mil");
  });

  it("milhões", () => {
    expect(numberToWords(1_000_000)).toBe("um milhão");
    expect(numberToWords(2_500_000)).toBe("dois milhões e quinhentos mil");
  });

  it("mil milhões", () => {
    expect(numberToWords(1_000_000_000)).toBe("mil milhões");
  });

  it("negativos e inválidos", () => {
    expect(numberToWords(-12)).toBe("menos doze");
    expect(numberToWords(Infinity)).toBe("");
    expect(numberToWords(NaN)).toBe("");
  });
});

describe("ordinal", () => {
  it("devolve ordinal pt", () => {
    expect(ordinal(1)).toBe("1.º");
    expect(ordinal(23)).toBe("23.º");
  });

  it("inválidos devolvem vazio", () => {
    expect(ordinal(0)).toBe("");
    expect(ordinal(-2)).toBe("");
    expect(ordinal(NaN)).toBe("");
    expect(ordinal(Infinity)).toBe("");
  });
});

describe("round", () => {
  it("arredonda com precisão", () => {
    expect(round(2.345, 2)).toBe(2.35);
    expect(round(2.5)).toBe(3);
    expect(round(2.4)).toBe(2);
  });

  it("evita erro de floating point", () => {
    expect(round(0.1 + 0.2, 2)).toBe(0.3);
  });
});

describe("toFixedSafe", () => {
  it("formata com precisão fixa", () => {
    expect(toFixedSafe(2.345, 2)).toBe("2.35");
    expect(toFixedSafe(1)).toBe("1.00");
  });

  it("não finitos devolvem 0", () => {
    expect(toFixedSafe(NaN)).toBe("0");
    expect(toFixedSafe(Infinity)).toBe("0");
  });
});