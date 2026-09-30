import { describe, expect, it } from "vitest";
import {
	forgotPasswordSchema,
	loginSchema,
	registerSchema,
} from "../auth-schemas";
import { createEventSchema } from "../event-schemas";
import { guestSchema } from "../guest-schemas";
import { taskSchema } from "../task-schemas";

describe("loginSchema", () => {
	it("accepts valid email and password", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "password123",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid email", () => {
		const result = loginSchema.safeParse({
			email: "not-an-email",
			password: "password123",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const emailError = result.error.issues.find((i) =>
				i.path.includes("email"),
			);
			expect(emailError?.message).toBe("Email inválido");
		}
	});

	it("rejects empty email", () => {
		const result = loginSchema.safeParse({
			email: "",
			password: "password123",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty password", () => {
		const result = loginSchema.safeParse({
			email: "user@example.com",
			password: "",
		});
		expect(result.success).toBe(false);
	});
});

describe("registerSchema", () => {
	const validData = {
		name: "João Silva",
		email: "joao@example.com",
		password: "Password1",
		confirmPassword: "Password1",
	};

	it("accepts valid registration data", () => {
		const result = registerSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("rejects mismatched passwords", () => {
		const result = registerSchema.safeParse({
			...validData,
			confirmPassword: "Different1",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const confirmError = result.error.issues.find((i) =>
				i.path.includes("confirmPassword"),
			);
			expect(confirmError?.message).toBe("As palavras-passe não coincidem");
		}
	});

	it("rejects short name", () => {
		const result = registerSchema.safeParse({ ...validData, name: "J" });
		expect(result.success).toBe(false);
	});

	it("rejects password without uppercase", () => {
		const result = registerSchema.safeParse({
			...validData,
			password: "password1",
			confirmPassword: "password1",
		});
		expect(result.success).toBe(false);
	});

	it("rejects password without number", () => {
		const result = registerSchema.safeParse({
			...validData,
			password: "Password",
			confirmPassword: "Password",
		});
		expect(result.success).toBe(false);
	});

	it("rejects password shorter than 8 chars", () => {
		const result = registerSchema.safeParse({
			...validData,
			password: "Pass1",
			confirmPassword: "Pass1",
		});
		expect(result.success).toBe(false);
	});
});

describe("forgotPasswordSchema", () => {
	it("accepts valid email", () => {
		const result = forgotPasswordSchema.safeParse({
			email: "user@example.com",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid email", () => {
		const result = forgotPasswordSchema.safeParse({ email: "bad" });
		expect(result.success).toBe(false);
	});
});

describe("createEventSchema", () => {
	it("accepts valid event data", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "Casamento João e Maria",
			startTime: "14:00",
			endTime: "23:00",
		});
		expect(result.success).toBe(true);
	});

	it("accepts event with optional fields", () => {
		const futureDate = new Date();
		futureDate.setFullYear(futureDate.getFullYear() + 1);
		const dateStr = futureDate.toISOString().split("T")[0];
		const result = createEventSchema.safeParse({
			type: "ENGAGEMENT",
			name: "Noivado",
			eventDate: dateStr,
			startTime: "18:30",
			endTime: "23:59",
			venueName: "Hotel Tropical",
			capacity: 200,
			budgetAmount: 5000000,
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing type", () => {
		const result = createEventSchema.safeParse({
			name: "Event",
			startTime: "14:00",
			endTime: "23:00",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty name", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "",
			startTime: "14:00",
			endTime: "23:00",
		});
		expect(result.success).toBe(false);
	});

	it("rejects short name", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "A",
			startTime: "14:00",
			endTime: "23:00",
		});
		expect(result.success).toBe(false);
	});

	// O horário é obrigatório na criação, no cliente e no servidor.
	it("rejects a missing start time", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "Casamento",
			endTime: "23:00",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				"O horário de início é obrigatório",
			);
		}
	});

	it("rejects a missing end time", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "Casamento",
			startTime: "14:00",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				"O horário de fim é obrigatório",
			);
		}
	});

	it("rejects a malformed time", () => {
		const result = createEventSchema.safeParse({
			type: "WEDDING",
			name: "Casamento",
			startTime: "25:00",
			endTime: "23:00",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe(
				"Formato de hora inválido. Use HH:mm.",
			);
		}
	});
});

describe("guestSchema", () => {
	it("accepts valid guest data", () => {
		const result = guestSchema.safeParse({ name: "Maria Santos" });
		expect(result.success).toBe(true);
	});

	it("accepts guest with all optional fields", () => {
		const result = guestSchema.safeParse({
			name: "Maria Santos",
			phone: "912345678",
			email: "maria@example.com",
			group: "Família",
			type: "FAMILY",
			companionsLimit: 2,
			notes: "VIP guest",
			status: "CONFIRMED",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty name", () => {
		const result = guestSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});

	it("rejects negative companions", () => {
		const result = guestSchema.safeParse({
			name: "Maria",
			companionsLimit: -1,
		});
		expect(result.success).toBe(false);
	});
});

describe("taskSchema", () => {
	it("accepts valid task data", () => {
		const result = taskSchema.safeParse({
			title: "Reservar buffet",
			category: "FOOD",
		});
		expect(result.success).toBe(true);
	});

	it("accepts task with all fields", () => {
		const result = taskSchema.safeParse({
			title: "Comprar flores",
			description: "Flores para as mesas",
			category: "DECORATION",
			priority: "HIGH",
			status: "TODO",
			assignedTo: "user-123",
			dueDate: "2025-10-01",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty title", () => {
		const result = taskSchema.safeParse({ title: "", category: "FOOD" });
		expect(result.success).toBe(false);
	});

	it("rejects missing category", () => {
		const result = taskSchema.safeParse({ title: "Task" });
		expect(result.success).toBe(false);
	});

	it("rejects invalid category", () => {
		const result = taskSchema.safeParse({ title: "Task", category: "INVALID" });
		expect(result.success).toBe(false);
	});
});
