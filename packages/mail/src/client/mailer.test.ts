import { beforeEach, describe, expect, it, vi } from "vitest";
import type { buildMailerConfig } from "../config/mailer-config";

type MailerConfig = ReturnType<typeof buildMailerConfig>;
type SendMailResult = {
	messageId?: string;
	accepted?: string[];
	rejected?: string[];
};

const sendMailImplRef: { current: () => Promise<SendMailResult> } = {
	current: async () => ({ messageId: "test-msg-id", accepted: ["a@b.c"] }),
};
const configRef: { current: MailerConfig } = { current: null };

vi.mock("nodemailer", () => ({
	default: {
		createTransport: () => ({ sendMail: () => sendMailImplRef.current() }),
	},
}));

vi.mock("../config/mailer-config", () => ({
	buildMailerConfig: () => configRef.current,
	mailFrom: () => '"Muxima" <no-reply@muxima.test>',
}));

const { deliverMail, getTransporter, resetTransporterForTests } = await import(
	"../client/mailer"
);

const MESSAGE = {
	to: "a@b.c",
	subject: "Assunto de teste",
	html: "<p>corpo</p>",
	text: "corpo",
};

describe("deliverMail", () => {
	beforeEach(() => {
		resetTransporterForTests();
		configRef.current = null;
		sendMailImplRef.current = async () => ({
			messageId: "test-msg-id",
			accepted: ["a@b.c"],
		});
	});

	it("reports SMTP_NOT_CONFIGURED (never throws) when there is no MAIL_HOST", async () => {
		const result = await deliverMail(MESSAGE);
		expect(result).toEqual({ ok: false, code: "SMTP_NOT_CONFIGURED" });
		expect(getTransporter()).toBeNull();
	});

	it("sends through the transporter and returns ok", async () => {
		configRef.current = { host: "smtp.test", port: 587 };
		const result = await deliverMail(MESSAGE);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.messageId).toBe("test-msg-id");
			expect(result.accepted).toEqual(["a@b.c"]);
			expect(result.rejected).toEqual([]);
		}
	});

	it("fails when the server accepted no recipient (without throwing)", async () => {
		configRef.current = { host: "smtp.test", port: 587 };
		sendMailImplRef.current = async () => ({
			messageId: "test-msg-id",
			accepted: [],
			rejected: ["a@b.c"],
		});

		const result = await deliverMail(MESSAGE);
		expect(result).toEqual({ ok: false, code: "SMTP_NO_RECIPIENTS" });
	});

	it("reports partial rejection as success but keeps the rejected list", async () => {
		configRef.current = { host: "smtp.test", port: 587 };
		sendMailImplRef.current = async () => ({
			messageId: "test-msg-id",
			accepted: ["a@b.c"],
			rejected: ["b@b.c"],
		});

		const result = await deliverMail(MESSAGE);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.accepted).toEqual(["a@b.c"]);
			expect(result.rejected).toEqual(["b@b.c"]);
		}
	});

	it("does not throw when SMTP fails; returns SMTP_FAILED", async () => {
		configRef.current = { host: "smtp.test", port: 587 };
		sendMailImplRef.current = async () => {
			const err = Object.assign(new Error("connect ECONNREFUSED"), {
				code: "ECONNREFUSED",
			});
			throw err;
		};

		const result = await deliverMail(MESSAGE);
		expect(result).toEqual({ ok: false, code: "SMTP_FAILED" });
	});

	it("lazy-builds a single transporter singleton", async () => {
		configRef.current = { host: "smtp.test", port: 587 };
		const t1 = getTransporter();
		const t2 = getTransporter();
		expect(t1).not.toBeNull();
		expect(t1).toBe(t2);
	});
});
