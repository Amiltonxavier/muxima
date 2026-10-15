import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MailMessage } from "../types/mail.types";

const deliverMailRef: {
	current: ReturnType<typeof vi.fn<(message: MailMessage) => Promise<void>>>;
} = {
	current: vi.fn(),
};

vi.mock("../client/mailer", () => ({
	deliverMail: (message: MailMessage) => deliverMailRef.current(message),
}));

const { MailService, formatAoa } = await import("./mail-service");

function htmlOf(index = 0): string {
	return String(deliverMailRef.current.mock.calls[index]?.[0]?.html ?? "");
}

function subjectOf(index = 0): string {
	return String(deliverMailRef.current.mock.calls[index]?.[0]?.subject ?? "");
}

function messageOf(index = 0): MailMessage {
	return deliverMailRef.current.mock.calls[index]?.[0] as MailMessage;
}

describe("MailService", () => {
	beforeEach(() => {
		deliverMailRef.current.mockReset();
	});

	it("sendOtp — renders the code and the short expiry", async () => {
		await MailService.sendOtp({ to: "a@b.c", otp: "283746" });

		expect(messageOf().to).toBe("a@b.c");
		expect(subjectOf()).toBe("O teu código de acesso Muxima");
		expect(htmlOf()).toContain("283746");
		expect(htmlOf()).toContain("5 minutos");
	});

	it("sendEventInvitation — links to the public invitation page", async () => {
		await MailService.sendEventInvitation({
			to: "g@b.c",
			guestName: "Maria",
			eventName: "Festa de Fim de Ano",
			eventDate: "31 de dezembro",
			inviteUrl: "https://app.muxima.test/invite/A1B2",
		});

		expect(subjectOf()).toContain('"Festa de Fim de Ano"');
		expect(htmlOf()).toContain("Maria");
		expect(htmlOf()).toContain("31 de dezembro");
		expect(htmlOf()).toContain("https://app.muxima.test/invite/A1B2");
	});

	it("sendMemberInvitation — accept/decline buttons and expiry", async () => {
		await MailService.sendMemberInvitation({
			to: "m@b.c",
			eventName: "Workshop",
			invitedBy: "Amílton",
			roleLabel: "Organizador",
			acceptUrl: "https://app.muxima.test/invite/member/tok1",
			declineUrl: "https://app.muxima.test/invite/member/tok1/decline",
			expiresInDays: 3,
		});

		expect(subjectOf()).toBe("Convite de membro — Workshop");
		expect(htmlOf()).toContain("Amílton");
		expect(htmlOf()).toContain("Organizador");
		expect(htmlOf()).toContain("3 dias");
		expect(htmlOf()).toContain("https://app.muxima.test/invite/member/tok1");
		expect(htmlOf()).toContain(
			"https://app.muxima.test/invite/member/tok1/decline",
		);
		expect(htmlOf()).toContain("Aceitar convite");
		expect(htmlOf()).toContain("Recusar");
	});

	it("sendPasswordChanged — includes name and IP, warns if not the user", async () => {
		await MailService.sendPasswordChanged({
			to: "a@b.c",
			name: "Ana",
			at: new Date("2026-10-08T10:30:00Z"),
			ip: "1.2.3.4",
		});

		expect(subjectOf()).toBe("A tua palavra-passe foi alterada");
		expect(htmlOf()).toContain("Ana");
		expect(htmlOf()).toContain("1.2.3.4");
		expect(htmlOf()).toContain("Se não foste tu");
	});

	it("sendAccountBlocked — includes reason when given", async () => {
		await MailService.sendAccountBlocked({
			to: "a@b.c",
			name: "Ana",
			reason: "Suspeita de acesso não autorizado",
		});

		expect(subjectOf()).toBe("A tua conta foi bloqueada");
		expect(htmlOf()).toContain("Ana");
		expect(htmlOf()).toContain("Suspeita de acesso não autorizado");
		expect(htmlOf()).toContain("bloqueada");
	});

	it("sendAccountUnblocked — informs re-activation", async () => {
		await MailService.sendAccountUnblocked({ to: "a@b.c", name: "Ana" });

		expect(subjectOf()).toBe("A tua conta foi desbloqueada");
		expect(htmlOf()).toContain("Ana");
		expect(htmlOf()).toContain("voltar a iniciar sessão");
	});

	it("sendBudgetChanged — Kz amounts, actor and budget page CTA", async () => {
		await MailService.sendBudgetChanged({
			to: "a@b.c",
			eventName: "Conferência",
			actorName: "Pedro",
			plannedCents: 250_000_00,
			reserveCents: 10_000_00,
			budgetUrl: "https://app.muxima.test/events/e1/budget",
		});

		expect(subjectOf()).toContain("Conferência");
		expect(htmlOf()).toContain("Pedro");
		expect(htmlOf()).toContain("https://app.muxima.test/events/e1/budget");
		expect(htmlOf()).toContain("Kz");
	});

	it("sendPermissionsChanged — role, permissions and event CTA", async () => {
		await MailService.sendPermissionsChanged({
			to: "a@b.c",
			name: "Ana",
			eventName: "Festa",
			roleLabel: "Organizador",
			permissionLabels: ["Ver orçamento", "Gerir convites"],
			eventUrl: "https://app.muxima.test/events/e2",
		});

		expect(subjectOf()).toBe("As tuas permissões foram atualizadas — Festa");
		expect(htmlOf()).toContain("Organizador");
		expect(htmlOf()).toContain("Ver orçamento");
		expect(htmlOf()).toContain("Gerir convites");
		expect(htmlOf()).toContain("https://app.muxima.test/events/e2");
	});

	it("sendOwnershipChanged — tailored copy for the new owner", async () => {
		await MailService.sendOwnershipChanged({
			to: "novo@b.c",
			name: "Rui",
			eventName: "Gala",
			previousOwnerName: "Ana",
			isNewOwner: true,
			eventUrl: "https://app.muxima.test/events/e3",
		});

		expect(subjectOf()).toBe("Passas a ser o proprietário — Gala");
		expect(htmlOf()).toContain("Rui");
		expect(htmlOf()).toContain("Ana");
		expect(htmlOf()).toContain("proprietário");
	});

	it("sendOwnershipChanged — tailored copy for the previous owner", async () => {
		await MailService.sendOwnershipChanged({
			to: "antigo@b.c",
			name: "Ana",
			eventName: "Gala",
			newOwnerName: "Rui",
			isNewOwner: false,
			eventUrl: "https://app.muxima.test/events/e3",
		});

		expect(subjectOf()).toBe("Deixaste de ser o proprietário — Gala");
		expect(htmlOf()).toContain("Rui");
		expect(htmlOf()).toContain("Continuas membro da equipa");
	});

	it("sendEmailVerification — confirmation link and validity copy", async () => {
		await MailService.sendEmailVerification({
			to: "novo@b.c",
			name: "Rui",
			verifyUrl: "https://app.muxima.test/verify-email?token=tok-123",
			expiresInMinutes: 60,
		});

		expect(subjectOf()).toBe("Confirma o teu e-mail Muxima");
		expect(htmlOf()).toContain("Rui");
		expect(htmlOf()).toContain("60 minutos");
		expect(htmlOf()).toContain(
			"https://app.muxima.test/verify-email?token=tok-123",
		);
		expect(htmlOf()).toContain("Confirmar e-mail");
	});

	it("escapes user-provided values in every e-mail", async () => {
		await MailService.sendMemberInvitation({
			to: "m@b.c",
			eventName: "<script>alert(1)</script>",
			invitedBy: '"><img src=x>',
			roleLabel: "Organizador",
			acceptUrl: "https://app.muxima.test/invite/member/tok",
			expiresInDays: 3,
		});

		expect(htmlOf()).not.toContain("<script>alert(1)</script>");
		expect(htmlOf()).not.toContain("<img src=x>");
		expect(htmlOf()).toContain("&lt;script&gt;");
	});
});

describe("formatAoa", () => {
	it("formats cents as Angola currency", () => {
		expect(formatAoa(2_500_00)).toBe("2 500 Kz");
		expect(formatAoa(0)).toBe("0 Kz");
	});
});
