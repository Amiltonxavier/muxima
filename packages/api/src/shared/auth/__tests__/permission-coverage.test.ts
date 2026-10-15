import {
	ACCESS_ROLES,
	ALL_PERMISSIONS,
	DEFAULT_ACCOUNT_ROLE,
	getSeedRolePermissions,
	PERMISSIONS,
	resolvePermissions,
} from "@muxima/permissions";
import { describe, expect, it } from "vitest";

/**
 * Coverage between the permission CATALOGUE and the seed MATRIX.
 *
 * The two live in the same package but answer different questions — "what
 * capability names exist?" and "who holds them?" — and they drift apart
 * silently: a key added to the catalogue with no holder is a procedure that can
 * never be authorized, and a matrix that references a key that was renamed is a
 * silent loss of access for every role.
 *
 * The `tables.create` bug is the worked example. `TABLE_CREATE/UPDATE/DELETE`
 * were in the catalogue, the guests router required them, and no role held them:
 * every seat-assignment screen would have returned 403 for every user, including
 * the owner, and nothing in the type system or the test suite noticed. These
 * tests make both directions fail loudly instead.
 */
describe("permission coverage", () => {
	const matrix = getSeedRolePermissions();

	it("grants every catalogue permission to at least one role", () => {
		const granted = new Set(Object.values(matrix).flat());
		const orphans = ALL_PERMISSIONS.filter((key) => !granted.has(key));

		expect(orphans).toEqual([]);
	});

	it("never references a permission outside the catalogue", () => {
		const known = new Set<string>(ALL_PERMISSIONS);
		const unknown = Object.values(matrix)
			.flat()
			.filter((key) => !known.has(key));

		expect(unknown).toEqual([]);
	});

	it("resolves a permission list per role without duplicates", () => {
		for (const role of ACCESS_ROLES) {
			const resolved = resolvePermissions([role]);

			expect(new Set(resolved).size, `${role} has duplicates`).toBe(
				resolved.length,
			);
		}
	});
});

describe("the role matrix", () => {
	it("keeps VIEWER read-only apart from their own account", () => {
		const viewer = getSeedRolePermissions().VIEWER;
		// Self-scoped capabilities act on the caller's OWN rows — the row filter
		// is the authorization, so they cannot expose anyone else's data and are
		// not "writes" in the sense this test is about.
		const SELF_SCOPED = new Set<string>([
			PERMISSIONS.PROFILE_UPDATE,
			PERMISSIONS.PROFILE_PASSWORD_CHANGE,
			PERMISSIONS.NOTIFICATION_UPDATE,
			PERMISSIONS.NOTIFICATION_DELETE,
			PERMISSIONS.INVITATION_RESPOND,
		]);
		const writes = ALL_PERMISSIONS.filter(
			(key) =>
				!SELF_SCOPED.has(key) &&
				(key.endsWith(".create") ||
					key.endsWith(".update") ||
					key.endsWith(".delete")),
		);

		expect(writes.length).toBeGreaterThan(0);

		for (const key of writes) {
			expect(viewer, `VIEWER must not hold ${key}`).not.toContain(key);
		}

		expect(viewer).toContain(PERMISSIONS.PROFILE_UPDATE);
		expect(viewer).toContain(PERMISSIONS.EVENT_READ);
	});

	it("reserves ownership transfer for the OWNER alone", () => {
		// Changing who owns the event, or deleting it, is what turns a role into
		// full control. Both must be non-delegable, otherwise any role above
		// VIEWER could escalate itself to OWNER.
		const holders = ACCESS_ROLES.filter((role) =>
			getSeedRolePermissions()[role].includes(PERMISSIONS.MEMBER_UPDATE_ROLE),
		);

		expect(holders).toEqual(["OWNER"]);
	});

	it("gives EDITOR planning writes but no team or event administration", () => {
		const editor = getSeedRolePermissions().EDITOR;

		expect(editor).toContain(PERMISSIONS.TASK_CREATE);
		expect(editor).toContain(PERMISSIONS.GUEST_CREATE);
		expect(editor).toContain(PERMISSIONS.TABLE_CREATE);

		expect(editor).not.toContain(PERMISSIONS.MEMBER_INVITE);
		expect(editor).not.toContain(PERMISSIONS.MEMBER_ADD);
		expect(editor).not.toContain(PERMISSIONS.MEMBER_REMOVE);
		expect(editor).not.toContain(PERMISSIONS.EVENT_UPDATE);
		expect(editor).not.toContain(PERMISSIONS.EVENT_DELETE);
	});

	it("never grants a write without its matching read", () => {
		// A write without the matching read is almost always a mistake: it lets a
		// member mutate rows they are not allowed to see. The exceptions are the
		// self-scoped acts (`invitations.respond` answers your own invitation)
		// and `exports.create`, which gates the download action itself rather
		// than a resource — the data it reads is already covered by the module's
		// own read/export permission.
		const WRITE_WITHOUT_READ = new Set<string>([
			PERMISSIONS.INVITATION_RESPOND,
			PERMISSIONS.EXPORT_CREATE,
		]);

		for (const role of ACCESS_ROLES) {
			const held = getSeedRolePermissions()[role];

			for (const key of held) {
				const [resource, action] = key.split(".");
				if (action !== "create" && action !== "update" && action !== "delete") {
					continue;
				}
				if (WRITE_WITHOUT_READ.has(key)) continue;

				expect(held, `${role} can ${key} without ${resource}.read`).toContain(
					`${resource}.read`,
				);
			}
		}
	});
});

describe("the default account role (USER)", () => {
	const user = getSeedRolePermissions()[DEFAULT_ACCOUNT_ROLE];

	it("grants the ability to start an event and to read it back", () => {
		expect(user).toContain(PERMISSIONS.EVENT_CREATE);
		expect(user).toContain(PERMISSIONS.EVENT_READ);
	});

	it("is pinned to self-service plus events.create/read — nothing else", () => {
		// The account default is assigned to EVERY user at sign-up, so the
		// blast radius of anything added here is the whole user base. Event-
		// scoped management (guests, budget, team, updating/deleting an event)
		// comes from the `EventMember` row, never from this role — that is
		// what keeps ownership enforced per event.
		const EXPECTED = [
			PERMISSIONS.EVENT_CREATE,
			PERMISSIONS.EVENT_READ,
			PERMISSIONS.ACTIVITY_READ,
			PERMISSIONS.PROFILE_READ,
			PERMISSIONS.PROFILE_UPDATE,
			PERMISSIONS.PROFILE_PASSWORD_CHANGE,
			PERMISSIONS.NOTIFICATION_READ,
			PERMISSIONS.NOTIFICATION_UPDATE,
			PERMISSIONS.NOTIFICATION_DELETE,
		].sort();

		expect([...user].sort()).toEqual(EXPECTED);
	});

	it("holds no administrative capability", () => {
		// "Administrative" means: seeing beyond your own rows, changing who
		// holds a role, or destroying an event. The base role must have none
		// of it — `ACCESS_ROLES` membership makes the existing OWNER-only /
		// elevated-only invariants above apply to USER automatically too.
		const ADMINISTRATIVE = [
			PERMISSIONS.ACTIVITY_READ_ALL,
			PERMISSIONS.MEMBER_INVITE,
			PERMISSIONS.MEMBER_ADD,
			PERMISSIONS.MEMBER_UPDATE_ROLE,
			PERMISSIONS.MEMBER_REMOVE,
			PERMISSIONS.EVENT_UPDATE,
			PERMISSIONS.EVENT_DELETE,
		];

		for (const key of ADMINISTRATIVE) {
			expect(user, `USER must not hold ${key}`).not.toContain(key);
		}
	});
});
