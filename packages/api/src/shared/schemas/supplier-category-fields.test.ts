import { describe, expect, it } from "vitest";

import {
	parseSupplierCategoryFields,
	SUPPLIER_CATEGORY_FIELDS,
	SUPPLIER_CATEGORY_ORDER,
} from "./supplier-category-fields";

describe("SUPPLIER_CATEGORY_FIELDS", () => {
	it("serves a label and a field list for every known category", () => {
		expect(SUPPLIER_CATEGORY_ORDER.length).toBeGreaterThan(0);

		for (const key of SUPPLIER_CATEGORY_ORDER) {
			const spec = SUPPLIER_CATEGORY_FIELDS[key];
			expect(spec, key).toBeDefined();
			expect(spec?.label, key).toBeTruthy();
			expect(Array.isArray(spec?.fields), key).toBe(true);
		}
	});

	it("gives every declared field a name and a pt-PT label", () => {
		for (const key of SUPPLIER_CATEGORY_ORDER) {
			for (const field of SUPPLIER_CATEGORY_FIELDS[key]?.fields ?? []) {
				expect(field.name, `${key}.${field.label}`).toBeTruthy();
				expect(field.label, `${key}.${field.name}`).toBeTruthy();
				expect(field.type, `${key}.${field.name}`).toBeTruthy();
			}
		}
	});

	it("never declares the same field twice within a category", () => {
		for (const key of SUPPLIER_CATEGORY_ORDER) {
			const names = (SUPPLIER_CATEGORY_FIELDS[key]?.fields ?? []).map(
				(f) => f.name,
			);
			expect(new Set(names).size, key).toBe(names.length);
		}
	});
});

describe("parseSupplierCategoryFields", () => {
	it("returns null when nothing was submitted", () => {
		expect(parseSupplierCategoryFields("VENUE", undefined)).toBeNull();
		expect(parseSupplierCategoryFields("VENUE", null)).toBeNull();
	});

	it("accepts a valid payload for a category", () => {
		const fields = parseSupplierCategoryFields("VENUE", {
			capacity: 120,
			indoor: true,
		});

		expect(fields).toMatchObject({ capacity: 120, indoor: true });
	});

	it("accepts an empty payload", () => {
		expect(parseSupplierCategoryFields("VENUE", {})).toEqual({});
	});

	it("rejects a field that does not belong to the category", () => {
		expect(() =>
			parseSupplierCategoryFields("PHOTOGRAPHER", { capacity: 120 }),
		).toThrow(/Campos inválidos/);
	});

	it("rejects a field with the wrong type", () => {
		expect(() =>
			parseSupplierCategoryFields("VENUE", { capacity: "muito" }),
		).toThrow(/Campos inválidos/);
	});

	it("rejects an unknown category", () => {
		expect(() => parseSupplierCategoryFields("NOT_A_CATEGORY", {})).toThrow(
			/Campos inválidos/,
		);
	});
});
