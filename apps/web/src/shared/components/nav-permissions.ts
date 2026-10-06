import type { Permission } from "@muxima/permissions";

/**
 * Navigation filtering, as a pure function.
 *
 * Kept out of the component so it can be tested without a router, a session and
 * a query cache — the filtering is the part that decides whether a user is shown
 * a section they cannot open, and that is exactly the part worth testing
 * directly.
 *
 * The rules, in order:
 *
 * - An item with no `permission` is always visible. Those are surfaces that need
 *   no capability of their own (the dashboard, own profile).
 * - An item is visible when the caller holds its permission.
 * - A group whose items are all hidden disappears entirely, including its
 *   heading. A "Planeamento" label above nothing reads as a rendering bug.
 */

export interface NavItem {
	label: string;
	icon: React.ReactNode;
	to: string;
	/**
	 * Capability required to SEE this item. Typed as `Permission` so a typo is a
	 * compile error rather than an item that silently never appears — which is
	 * indistinguishable from a bug report of "the menu is missing".
	 */
	permission?: Permission;
}

export interface NavGroup {
	label: string;
	items: NavItem[];
}

export function filterNavGroups(
	groups: readonly NavGroup[],
	granted: ReadonlySet<Permission>,
): NavGroup[] {
	return groups
		.map((group) => ({
			...group,
			items: group.items.filter(
				(item) => !item.permission || granted.has(item.permission),
			),
		}))
		.filter((group) => group.items.length > 0);
}
