import { describe, expect, it } from "vitest";
import { ellipsis } from "./ellipsis";
import { formatAngolanPhone } from "./format-angolan-phone";
import { formatIBAN } from "./format-iban";
import { normalizeSearch } from "./normalize-search";
import { slugify } from "./slugify";
import {
	capitalize,
	initials,
	titleCase,
	toCamelCase,
	toKebabCase,
	toPascalCase,
	toSnakeCase,
} from "./string-case";
import { StringHelper } from "./string-helper";

describe("formatAngolanPhone", () => {
	it("formata número de 9 dígitos", () => {
		expect(formatAngolanPhone("923456789")).toBe("+244 923 456 789");
	});

	it("aceita número já com prefixo 244", () => {
		expect(formatAngolanPhone("244923456789")).toBe("+244 923 456 789");
	});

	it("remove caracteres não numéricos", () => {
		expect(formatAngolanPhone("(+244) 923-456-789")).toBe("+244 923 456 789");
	});

	it("devolve +244 com o número quando não tem 9 dígitos", () => {
		expect(formatAngolanPhone("123")).toBe("+244 123");
	});

	it("devolve +244 vazio para string vazia", () => {
		expect(formatAngolanPhone("")).toBe("+244 ");
	});
});

describe("formatIBAN", () => {
	it("agrupa de 4 em 4 caracteres", () => {
		expect(formatIBAN("AO33000000000000000000000")).toBe(
			"AO33 0000 0000 0000 0000 0000 0",
		);
	});

	it("remove espaços antes de agrupar", () => {
		expect(formatIBAN("AO33 0000 0000 0000 0000 0000 0")).toBe(
			"AO33 0000 0000 0000 0000 0000 0",
		);
	});

	it("string vazia devolve vazia", () => {
		expect(formatIBAN("")).toBe("");
	});
});

describe("ellipsis", () => {
	it("não corta strings curtas", () => {
		expect(ellipsis("olá")).toBe("olá");
	});

	it("corta e acrescenta ...", () => {
		expect(ellipsis("texto muito longo para caber", 10)).toBe("texto mui...");
	});

	it("maxLength pequeno mantém pelo menos 1 char", () => {
		expect(ellipsis("ab", 1)).toBe("a...");
	});
});

describe("StringHelper", () => {
	it("join ignora null e undefined e normaliza espaços", () => {
		expect(StringHelper.join(" João ", null, "Xavier", undefined, "")).toBe(
			"João Xavier",
		);
	});

	it("fullName combina nome e apelido", () => {
		expect(StringHelper.fullName("Ana", "Silva")).toBe("Ana Silva");
		expect(StringHelper.fullName("Ana")).toBe("Ana");
		expect(StringHelper.fullName()).toBe("");
	});

	it("initials respeita limite", () => {
		expect(StringHelper.initials("Maria João dos Santos", 3)).toBe("MJD");
		expect(StringHelper.initials("Maria", 2)).toBe("M");
		expect(StringHelper.initials(null)).toBe("");
	});

	it("capitalize e capitalizeWords", () => {
		expect(StringHelper.capitalize("LUANDA")).toBe("Luanda");
		expect(StringHelper.capitalize("")).toBe("");
		expect(StringHelper.capitalizeWords("junta municipal")).toBe(
			"Junta Municipal",
		);
	});

	it("normalize junta espaços", () => {
		expect(StringHelper.normalize("  a   b  ")).toBe("a b");
		expect(StringHelper.normalize(null)).toBe("");
	});

	it("truncate", () => {
		expect(StringHelper.truncate("abcdefghij", 5)).toBe("abcde...");
		expect(StringHelper.truncate("abc", 5)).toBe("abc");
		expect(StringHelper.truncate(undefined)).toBe("");
	});

	it("isEmpty", () => {
		expect(StringHelper.isEmpty("   ")).toBe(true);
		expect(StringHelper.isEmpty("x")).toBe(false);
		expect(StringHelper.isEmpty(null)).toBe(true);
	});

	it("slug", () => {
		expect(StringHelper.slug("Olá Mundo!")).toBe("ola-mundo");
		expect(StringHelper.slug("")).toBe("");
	});
});

describe("normalizeSearch", () => {
	it("remove acentos, minúsculas e colapsa espaços", () => {
		expect(normalizeSearch("  JOÃO   XAVIER  ")).toBe("joao xavier");
	});

	it("string vazia", () => {
		expect(normalizeSearch("   ")).toBe("");
	});

	it("mantém caracteres especiais", () => {
		expect(normalizeSearch("luanda-cidade")).toBe("luanda-cidade");
	});
});

describe("cases", () => {
	it("capitalize via case helpers", () => {
		expect(capitalize("olá")).toBe("Olá");
	});

	it("titleCase", () => {
		expect(titleCase("joão xavier")).toBe("João Xavier");
	});

	it("initials", () => {
		expect(initials("joão xavier")).toBe("JX");
		expect(initials("joão xavier", 1)).toBe("J");
	});

	it("toPascalCase de strings separadas", () => {
		expect(toPascalCase("relatorio anual")).toBe("RelatorioAnual");
		expect(toPascalCase("relatorio_anual")).toBe("RelatorioAnual");
		expect(toPascalCase("1relatorio")).toBe("1relatorio");
	});

	it("camel/snake/kebab com acentos", () => {
		expect(toCamelCase("relatorio-anual")).toBe("relatorioAnual");
		expect(toCamelCase("Relatório Anual")).toBe("relatRioAnual");
		expect(toSnakeCase("Relatório Anual")).toBe("relatorio_anual");
		expect(toKebabCase("Relatório Anual")).toBe("relatorio-anual");
		expect(toKebabCase("relatorio_anual")).toBe("relatorio-anual");
	});
});

describe("slugify", () => {
	it("normaliza acentos e pontuação", () => {
		expect(slugify("Olá, Mundo!")).toBe("ola-mundo");
		expect(slugify("  Café & BOLO  ")).toBe("cafe-bolo");
	});

	it("remove hífens duplicados e marginais", () => {
		expect(slugify("a--b--c")).toBe("a-b-c");
		expect(slugify("-abc-")).toBe("abc");
	});

	it("string vazia", () => {
		expect(slugify("")).toBe("");
	});
});
