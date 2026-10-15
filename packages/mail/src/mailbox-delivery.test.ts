import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { MailerConfig } from "./config/mailer-config";
import type { CapturedMail } from "./testing/smtp-capture";

/**
 * End-to-end e-mail delivery: every kind of e-mail the application sends is
 * exercised through the REAL `MailService` → `deliverMail` → Nodemailer stack
 * against an in-process SMTP server acting as the recipient's mailbox.
 *
 * Unlike `mail-service.test.ts` (which asserts what is handed to `deliverMail`)
 * and `mailer.test.ts` (which doubles Nodemailer), these tests prove the
 * message actually leaves the process over SMTP and is *received* — asserting
 * on the parsed subject, bodies and envelope of what landed in the mailbox.
 *
 * The transport is redirected to the ephemeral local port by mocking
 * `buildMailerConfig`; everything else (rendering, MIME encoding, SMTP dialogue,
 * MIME parsing) is real.
 */

const configRef: { current: MailerConfig | null } = { current: null };

vi.mock("./config/mailer-config", () => ({
	buildMailerConfig: () => configRef.current,
	mailFrom: () => '"Muxima" <no-reply@muxima.test>',
}));

const { MailService } = await import("./services/mail-service");
const { deliverMail, resetTransporterForTests } = await import(
	"./client/mailer"
);
const { startMailbox } = await import("./testing/smtp-capture");

let mailbox: Awaited<ReturnType<typeof startMailbox>>;

const RECIPIENT = "cliente@muxima.test";
const FROM = "no-reply@muxima.test";

beforeAll(async () => {
	mailbox = await startMailbox();
	configRef.current = {
		host: "127.0.0.1",
		port: mailbox.port,
		secure: false,
		requireTLS: false,
	};
});

afterAll(async () => {
	await mailbox.close();
});

beforeEach(() => {
	// Force the lazy transporter singleton to be rebuilt for the next send; the
	// port is stable for the whole file, but this keeps isolation if a test
	// swaps the config.
	resetTransporterForTests();
});

/** Runs a send and returns the message that just arrived in the mailbox. */
async function expectDelivered(
	send: () => Promise<unknown>,
): Promise<CapturedMail> {
	const before = mailbox.messages.length;
	const result = (await send()) as { ok?: boolean };
	expect(result.ok).toBe(true);
	await mailbox.waitFor(before + 1);
	const mail = mailbox.messages[before];
	if (!mail) throw new Error("Message not captured by the mailbox");
	return mail;
}

const html = (mail: CapturedMail) => String(mail.parsed.html ?? "");
const text = (mail: CapturedMail) => String(mail.parsed.text ?? "");

describe("entrega real de e-mail (SMTP → caixa do destinatário)", () => {
	it("sendEmailVerification — chega à caixa com o link de confirmação", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendEmailVerification({
				to: RECIPIENT,
				name: "Rui",
				verifyUrl: "https://app.muxima.test/verify-email?token=tok-123",
				expiresInMinutes: 60,
			}),
		);

		expect(mail.from).toBe(FROM);
		expect(mail.to).toEqual([RECIPIENT]);
		expect(mail.parsed.subject).toBe("Confirma o teu e-mail Muxima");
		expect(html(mail)).toContain(
			"https://app.muxima.test/verify-email?token=tok-123",
		);
		expect(text(mail)).toContain("60 minutos");
		expect(html(mail)).toContain("Rui");
	});

	it("sendOtp — chega à caixa com o código de acesso", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendOtp({ to: RECIPIENT, otp: "283746" }),
		);

		expect(mail.to).toEqual([RECIPIENT]);
		expect(mail.parsed.subject).toBe("O teu código de acesso Muxima");
		expect(html(mail)).toContain("283746");
		expect(text(mail)).toContain("283746");
	});

	it("sendPasswordChanged — alerta de segurança com IP", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendPasswordChanged({
				to: RECIPIENT,
				name: "Ana",
				at: new Date("2026-10-08T10:30:00Z"),
				ip: "1.2.3.4",
			}),
		);

		expect(mail.parsed.subject).toBe("A tua palavra-passe foi alterada");
		expect(html(mail)).toContain("1.2.3.4");
		expect(html(mail)).toContain("Ana");
	});

	it("sendAccountBlocked — notifica o bloqueio com o motivo", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendAccountBlocked({
				to: RECIPIENT,
				name: "Ana",
				reason: "Suspeita de acesso não autorizado",
			}),
		);

		expect(mail.parsed.subject).toBe("A tua conta foi bloqueada");
		expect(html(mail)).toContain("Suspeita de acesso não autorizado");
	});

	it("sendAccountUnblocked — notifica a reativação", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendAccountUnblocked({ to: RECIPIENT, name: "Ana" }),
		);

		expect(mail.parsed.subject).toBe("A tua conta foi desbloqueada");
		expect(html(mail)).toContain("voltar a iniciar sessão");
	});

	it("sendBudgetChanged — chega com os valores em Kwanzas", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendBudgetChanged({
				to: RECIPIENT,
				eventName: "Conferência",
				actorName: "Pedro",
				plannedCents: 250_000_00,
				reserveCents: 10_000_00,
				budgetUrl: "https://app.muxima.test/events/e1/budget",
			}),
		);

		expect(mail.parsed.subject).toContain("Conferência");
		expect(html(mail)).toContain("Kz");
		expect(html(mail)).toContain("Pedro");
		expect(html(mail)).toContain("https://app.muxima.test/events/e1/budget");
	});

	it("sendPermissionsChanged — chega com o papel e as permissões", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendPermissionsChanged({
				to: RECIPIENT,
				name: "Ana",
				eventName: "Festa",
				roleLabel: "Organizador",
				permissionLabels: ["Ver orçamento", "Gerir convites"],
				eventUrl: "https://app.muxima.test/events/e2",
			}),
		);

		expect(mail.parsed.subject).toBe(
			"As tuas permissões foram atualizadas — Festa",
		);
		expect(html(mail)).toContain("Organizador");
		expect(html(mail)).toContain("Ver orçamento");
		expect(html(mail)).toContain("Gerir convites");
	});

	it("sendOwnershipChanged — chega ao novo dono e ao antigo", async () => {
		const before = mailbox.messages.length;

		await MailService.sendOwnershipChanged({
			to: "novo@muxima.test",
			name: "Rui",
			eventName: "Gala",
			previousOwnerName: "Ana",
			isNewOwner: true,
			eventUrl: "https://app.muxima.test/events/e3",
		});
		await MailService.sendOwnershipChanged({
			to: "antigo@muxima.test",
			name: "Ana",
			eventName: "Gala",
			newOwnerName: "Rui",
			isNewOwner: false,
			eventUrl: "https://app.muxima.test/events/e3",
		});

		await mailbox.waitFor(before + 2);
		const [novo, antigo] = mailbox.messages.slice(before);

		expect(novo?.to).toEqual(["novo@muxima.test"]);
		expect(novo?.parsed.subject).toBe("Passas a ser o proprietário — Gala");
		expect(antigo?.to).toEqual(["antigo@muxima.test"]);
		expect(antigo?.parsed.subject).toBe(
			"Deixaste de ser o proprietário — Gala",
		);
	});

	it("sendEventInvitation — chega à caixa com o link público do convite", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendEventInvitation({
				to: RECIPIENT,
				guestName: "Maria",
				eventName: "Festa de Fim de Ano",
				eventDate: "31 de dezembro",
				inviteUrl: "https://app.muxima.test/invite/A1B2",
			}),
		);

		expect(mail.parsed.subject).toContain('"Festa de Fim de Ano"');
		expect(html(mail)).toContain("Maria");
		expect(html(mail)).toContain("31 de dezembro");
		expect(html(mail)).toContain("https://app.muxima.test/invite/A1B2");
	});

	it("sendMemberInvitation — chega à caixa com aceitar/recusar", async () => {
		const mail = await expectDelivered(() =>
			MailService.sendMemberInvitation({
				to: RECIPIENT,
				eventName: "Workshop",
				invitedBy: "Amílton",
				roleLabel: "Organizador",
				acceptUrl: "https://app.muxima.test/invite/member/tok1",
				declineUrl: "https://app.muxima.test/invite/member/tok1/decline",
				expiresInDays: 3,
			}),
		);

		expect(mail.parsed.subject).toBe("Convite de membro — Workshop");
		expect(html(mail)).toContain("Amílton");
		expect(html(mail)).toContain("https://app.muxima.test/invite/member/tok1");
		expect(html(mail)).toContain(
			"https://app.muxima.test/invite/member/tok1/decline",
		);
		expect(html(mail)).toContain("Aceitar convite");
		expect(html(mail)).toContain("Recusar");
	});

	it("deliverMail — o SMTP aceita o destinatário e devolve um messageId", async () => {
		const before = mailbox.messages.length;
		const result = await deliverMail({
			to: RECIPIENT,
			subject: "Assunto de teste",
			html: "<p>corpo</p>",
			text: "corpo",
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.accepted).toContain(RECIPIENT);
			expect(result.rejected).toEqual([]);
			expect(result.messageId).toBeTruthy();
		}

		await mailbox.waitFor(before + 1);
		const mail = mailbox.messages[before];
		expect(mail?.to).toEqual([RECIPIENT]);
		expect(mail?.parsed.subject).toBe("Assunto de teste");
	});
});
