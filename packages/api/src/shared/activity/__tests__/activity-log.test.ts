import {
	ACTIVITY_ACTIONS,
	buildChanges,
	type CreateActivityLogInput,
	createActivityLog,
	REDACTED,
	redactSecrets,
} from "@muxima/db/activity-log";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A stand-in for the `activityLog` delegate, capturing the rows handed to
 * `create`. `createActivityLog` accepts any object exposing that one method, so
 * no Prisma types or database are involved.
 */
function fakeActivityLog() {
	const created: Record<string, unknown>[] = [];
	const client = {
		activityLog: {
			create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
				created.push(data);
				return Promise.resolve(data);
			}),
		},
	};
	return { client, created };
}

/** Console noise from the deliberate failure cases would drown the report. */
beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("redactSecrets", () => {
	it("redacts credential-shaped keys", () => {
		const result = redactSecrets({
			password: "hunter2",
			newPassword: "hunter3",
			token: "abc",
			cookie: "session=1",
			secret: "s3cr3t",
			authorization: "Bearer x",
			apiKey: "k",
		});

		for (const value of Object.values(result)) {
			expect(value).toBe(REDACTED);
		}
	});

	it("matches sensitive keys regardless of case and separators", () => {
		// A caller forwarding a request body verbatim must not defeat the filter.
		const result = redactSecrets({
			NEW_PASSWORD: "a",
			"new-password": "b",
			newPassword: "c",
			PassWord: "d",
			api_key: "e",
		});

		expect(Object.values(result)).toEqual([
			REDACTED,
			REDACTED,
			REDACTED,
			REDACTED,
			REDACTED,
		]);
	});

	it("redacts recursively through objects and arrays", () => {
		const result = redactSecrets({
			user: { name: "Ana", contact: { email: "ana@x.com" } },
			attempts: [{ password: "a" }, { password: "b" }],
		});

		expect(result).toEqual({
			user: { name: "Ana", contact: { email: "ana@x.com" } },
			attempts: [{ password: REDACTED }, { password: REDACTED }],
		});
	});

	it("redacts a credential-bearing subtree wholesale", () => {
		// `credentials` matches on its own, so the whole nested object is
		// replaced rather than walked — the stronger of the two behaviours.
		const result = redactSecrets({
			credentials: { user: "ana", token: "abc", nested: { key: "k" } },
		});

		expect(result).toEqual({ credentials: REDACTED });
	});

	it("leaves innocuous values and non-plain values untouched", () => {
		const date = new Date("2026-01-01T00:00:00.000Z");
		const result = redactSecrets({
			name: "Ana",
			count: 3,
			active: true,
			createdAt: date,
			tags: ["a", "b"],
			nothing: null,
		});

		expect(result).toEqual({
			name: "Ana",
			count: 3,
			active: true,
			createdAt: date,
			tags: ["a", "b"],
			nothing: null,
		});
	});

	it("does not mutate its input", () => {
		const input = { password: "hunter2" };
		redactSecrets(input);

		expect(input.password).toBe("hunter2");
	});
});

describe("buildChanges", () => {
	const previous = { name: "Ana", email: "ana@x.com", role: "OWNER" } as const;

	it("returns only the fields that actually changed", () => {
		const changes = buildChanges(
			previous,
			{ name: "Ana Maria", email: "ana@x.com" },
			["name", "email", "role"],
		);

		expect(changes).toEqual([
			{ field: "name", before: "Ana", after: "Ana Maria" },
		]);
	});

	it("skips fields absent from the update payload", () => {
		// Partial update: untouched fields were not edited and must not be shown.
		const changes = buildChanges(previous, { name: "Bea" }, [
			"name",
			"email",
			"role",
		]);

		expect(changes).toEqual([{ field: "name", before: "Ana", after: "Bea" }]);
	});

	it("returns nothing when nothing changed", () => {
		expect(buildChanges(previous, { name: "Ana" }, ["name"])).toEqual([]);
	});

	it("reports a change when a value becomes null or undefined", () => {
		const changes = buildChanges(previous, { name: null }, ["name"]);

		expect(changes).toEqual([{ field: "name", before: "Ana", after: null }]);
	});
});

describe("createActivityLog", () => {
	it("persists a log row with the supplied fields", async () => {
		const { client, created } = fakeActivityLog();

		await createActivityLog({
			userId: "usr_1",
			action: "LOGIN",
			resource: "SESSION",
			description: "Sessão iniciada",
			ipAddress: "10.0.0.1",
			userAgent: "vitest",
			client,
		});

		expect(created).toEqual([
			{
				userId: "usr_1",
				action: "LOGIN",
				resource: "SESSION",
				description: "Sessão iniciada",
				ipAddress: "10.0.0.1",
				userAgent: "vitest",
			},
		]);
	});

	it("omits optional fields instead of writing nulls", async () => {
		const { client, created } = fakeActivityLog();

		await createActivityLog({
			userId: "usr_1",
			action: "LOGOUT",
			resource: "SESSION",
			description: "Sessão terminada",
			client,
		});

		expect(created[0]).not.toHaveProperty("metadata");
		expect(created[0]).not.toHaveProperty("eventId");
		expect(created[0]).not.toHaveProperty("resourceId");
	});

	it("redacts secrets inside metadata on the way to the database", async () => {
		const { client, created } = fakeActivityLog();

		const input: CreateActivityLogInput = {
			userId: "usr_1",
			action: "PASSWORD_CHANGED",
			resource: "PROFILE",
			description: "Palavra-passe alterada",
			metadata: {
				currentPassword: "hunter2",
				device: "iphone",
			},
			client,
		};

		await createActivityLog(input);

		expect(created[0]?.metadata).toEqual({
			currentPassword: REDACTED,
			device: "iphone",
		});
		// The caller's object is untouched, so re-logging it stays safe.
		expect(input.metadata).toEqual({
			currentPassword: "hunter2",
			device: "iphone",
		});
	});

	it("swallows write failures so the user action is not rolled back", async () => {
		const create = vi.fn(() => Promise.reject(new Error("db is down")));
		const client = { activityLog: { create } };

		// The whole point: the audit write failing must not surface to the caller,
		// because it would otherwise fail the profile update it describes.
		await expect(
			createActivityLog({
				userId: "usr_1",
				action: "LOGIN",
				resource: "SESSION",
				description: "Sessão iniciada",
				client,
			}),
		).resolves.toBeUndefined();

		expect(console.error).toHaveBeenCalled();
	});

	it("declares every action the application records", () => {
		// Guards the vocabulary against a typo'd action reaching the database.
		expect(ACTIVITY_ACTIONS).toContain("LOGIN");
		expect(ACTIVITY_ACTIONS).toContain("PASSWORD_CHANGED");
		expect(ACTIVITY_ACTIONS).toContain("EVENT_CREATED");
		expect(new Set(ACTIVITY_ACTIONS).size).toBe(ACTIVITY_ACTIONS.length);
	});
});
