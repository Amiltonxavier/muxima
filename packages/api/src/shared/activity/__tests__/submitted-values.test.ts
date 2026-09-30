import { buildChanges } from "@muxima/db/activity-log";
import { describe, expect, it } from "vitest";
import { submittedValues } from "../activity-context";

const SAVED_DATE = new Date("2026-06-20T00:00:00.000Z");

describe("submittedValues", () => {
	const saved = {
		id: "evt_1",
		name: "Casamento Ana",
		eventDate: SAVED_DATE,
		startTime: "15:00",
		capacity: 120,
		// Never submitted, and never part of a diff.
		createdAt: new Date("2025-01-01T00:00:00.000Z"),
	};

	it("reads the after-value off the saved row, not the raw input", () => {
		// The submitted date is a string and the stored one is a Date. Reading the
		// value from `saved` is what keeps both sides of the diff the same type.
		const after = submittedValues(saved, {
			eventDate: "2026-06-20T00:00:00.000Z",
		});

		expect(after).toEqual({ eventDate: SAVED_DATE });
	});

	it("omits fields the caller did not submit", () => {
		const after = submittedValues(saved, { name: "Casamento Ana e Rui" });

		expect(Object.keys(after)).toEqual(["name"]);
	});

	it("ignores submitted fields the record does not have", () => {
		expect(submittedValues(saved, { notAColumn: 1 })).toEqual({});
	});
});

describe("event date diff regression", () => {
	const stored = { name: "Casamento Ana", eventDate: SAVED_DATE };

	it("does not report a date change when the same date is resubmitted", () => {
		// The bug this guards: diffing the raw input against the stored record
		// compared a string to a Date, so Object.is was always false and *every*
		// event update logged a phantom date change.
		const changes = buildChanges(
			stored,
			submittedValues(stored, {
				eventDate: "2026-06-20T00:00:00.000Z",
			}),
			["name", "eventDate"],
		);

		expect(changes).toEqual([]);
	});

	it("still reports a real date change", () => {
		const saved = {
			...stored,
			eventDate: new Date("2026-07-01T00:00:00.000Z"),
		};

		const changes = buildChanges(
			stored,
			submittedValues(saved, { eventDate: "2026-07-01T00:00:00.000Z" }),
			["name", "eventDate"],
		);

		expect(changes).toEqual([
			{ field: "eventDate", before: SAVED_DATE, after: saved.eventDate },
		]);
	});

	it("reports only the fields that moved", () => {
		const saved = { ...stored, name: "Casamento Ana e Rui" };

		const changes = buildChanges(
			stored,
			submittedValues(saved, {
				name: "Casamento Ana e Rui",
				eventDate: "2026-06-20T00:00:00.000Z",
			}),
			["name", "eventDate"],
		);

		expect(changes).toEqual([
			{
				field: "name",
				before: "Casamento Ana",
				after: "Casamento Ana e Rui",
			},
		]);
	});
});
