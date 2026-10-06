import { PERMISSIONS } from "@muxima/permissions";
import { describe, expect, it } from "vitest";
import { filterNavGroups, type NavGroup } from "../nav-permissions";

const groups: NavGroup[] = [
	{
		label: "",
		items: [
			{ label: "Visão geral", icon: null, to: "/a" },
			{
				label: "Orçamento",
				icon: null,
				to: "/b",
				permission: PERMISSIONS.BUDGET_READ,
			},
		],
	},
	{
		label: "Equipa",
		items: [
			{
				label: "Membros",
				icon: null,
				to: "/c",
				permission: PERMISSIONS.MEMBER_READ,
			},
		],
	},
];

const labels = (result: NavGroup[]) =>
	result.flatMap((group) => group.items.map((item) => item.label));

describe("filterNavGroups", () => {
	it("keeps items that require no capability", () => {
		// The dashboard and own profile are self-scoped; a user with no
		// permissions at all must still reach them.
		const result = filterNavGroups(groups, new Set());

		expect(labels(result)).toEqual(["Visão geral"]);
	});

	it("keeps the permission-free items plus the ones the caller holds", () => {
		const result = filterNavGroups(groups, new Set([PERMISSIONS.BUDGET_READ]));

		expect(labels(result)).toEqual(["Visão geral", "Orçamento"]);
	});

	it("drops a group and its heading when nothing inside survives", () => {
		const result = filterNavGroups(groups, new Set([PERMISSIONS.BUDGET_READ]));

		expect(result.map((group) => group.label)).toEqual([""]);
	});

	it("shows everything when every permission is granted", () => {
		const result = filterNavGroups(
			groups,
			new Set([PERMISSIONS.BUDGET_READ, PERMISSIONS.MEMBER_READ]),
		);

		expect(labels(result)).toEqual(["Visão geral", "Orçamento", "Membros"]);
	});

	it("does not mutate the groups it was given", () => {
		const before = labels(groups);

		filterNavGroups(groups, new Set());

		expect(labels(groups)).toEqual(before);
	});
});
