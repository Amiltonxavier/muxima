import { deliverMail } from "../client/mailer";
import {
	bulletList,
	detailList,
	infoBox,
	otpCodeBlock,
	renderBaseEmail,
} from "../templates/base-template";
import type { MailDeliveryResult } from "../types/mail.types";

/**
 * `MailService` — the single façade the whole app uses to send e-mails.
 *
 * Business logic never touches Nodemailer: it calls one typed method per
 * e-mail kind, the service renders the shared Muxima template and hands the
 * message to the central mailer. URLs are always provided by the caller, so
 * this package stays decoupled from the app's route names and frontend origin.
 */

export type SendEventInvitationInput = {
	to: string;
	guestName?: string;
	eventName: string;
	eventDate?: string;
	/** Public URL of the guest invitation (accept/reject RSVP page). */
	inviteUrl: string;
};

export type SendMemberInvitationInput = {
	to: string;
	eventName: string;
	invitedBy?: string;
	/** Humanized role label (PT), resolved by the caller. */
	roleLabel: string;
	acceptUrl: string;
	declineUrl?: string;
	expiresInDays: number;
};

export type SendOtpInput = {
	to: string;
	otp: string;
};

export type SendPasswordChangedInput = {
	to: string;
	name?: string;
	at: Date;
	ip?: string;
};

export type SendAccountBlockedInput = {
	to: string;
	name?: string;
	reason?: string;
};

export type SendAccountUnblockedInput = {
	to: string;
	name?: string;
};

export type SendBudgetChangedInput = {
	to: string;
	eventName: string;
	actorName?: string;
	/** Values in cents (the budget domain unit). */
	plannedCents: number;
	reserveCents: number;
	budgetUrl: string;
};

export type SendPermissionsChangedInput = {
	to: string;
	name?: string;
	eventName: string;
	roleLabel: string;
	/** Humanized permission labels (PT), resolved by the caller. */
	permissionLabels: string[];
	eventUrl: string;
};

export type SendOwnershipChangedInput = {
	to: string;
	name?: string;
	eventName: string;
	previousOwnerName?: string;
	newOwnerName?: string;
	/** Tailored copy for the new owner vs. the previous one. */
	isNewOwner: boolean;
	eventUrl: string;
};

export type SendEmailVerificationInput = {
	to: string;
	name?: string;
	/** One-time link that confirms the account, valid for `expiresInMinutes`. */
	verifyUrl: string;
	/** Token lifetime in minutes, used in the copy. */
	expiresInMinutes: number;
};

/** Simple greeting derived from a raw `name` value, used all over the services. */
function greeting(name?: string): string {
	return name?.trim() ? `Olá ${name},` : "Olá,";
}

/**
 * Angola currency formatting from cents: `1 250 000 Kz`. Grouping is applied
 * from the thousands (currency amount, not a raw number count) and any
 * locale-specific non-breaking spaces are normalized for stable output.
 */
export function formatAoa(cents: number): string {
	const value = (cents / 100)
		.toLocaleString("pt-PT", {
			maximumFractionDigits: 2,
			minimumFractionDigits: 0,
			useGrouping: true,
		})
		.replaceAll("\u00A0", " ");
	return `${value} Kz`;
}

export const MailService = {
	/**
	 * Guest/event invitation (published RSVP). Accept/reject happens on the
	 * public invitation page linked by `inviteUrl`.
	 */
	async sendEventInvitation(
		input: SendEventInvitationInput,
	): Promise<MailDeliveryResult> {
		const subject = `Convite para "${input.eventName}"`;
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `${input.guestName ?? "Recebeste"} um convite para ${input.eventName}.`,
			title: `Convite para ${input.eventName}`,
			description: `${greeting(input.guestName)}\n\nTens um convite para o evento "${input.eventName}"${input.eventDate ? `, marcado para ${input.eventDate}` : ""}. Reserva a tua resposta na página do convite.`,
			cta: { label: "Responder ao convite", url: input.inviteUrl },
			footerNote: `Evento: ${input.eventName}`,
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Team member invitation with accept/reject buttons. */
	async sendMemberInvitation(
		input: SendMemberInvitationInput,
	): Promise<MailDeliveryResult> {
		const subject = `Convite de membro — ${input.eventName}`;
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `${input.invitedBy ?? "Alguém"} convida-te para a equipa de ${input.eventName}.`,
			title: "Convite de membro",
			description: `${greeting()}\n\n${input.invitedBy ? `${input.invitedBy} convida-te` : "Convidaram-te"} para entrar na equipa do evento "${input.eventName}" com o papel ${input.roleLabel}. O convite expira em ${input.expiresInDays} dias.`,
			cta: { label: "Aceitar convite", url: input.acceptUrl },
			secondaryCta: input.declineUrl
				? { label: "Recusar", url: input.declineUrl }
				: undefined,
			content: detailList([
				{ label: "Evento", value: input.eventName },
				{ label: "Papel", value: input.roleLabel },
			]),
			footerNote: `Convite para o evento "${input.eventName}"`,
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Login code (Better Auth `emailOTP` plugin callback). */
	async sendOtp(input: SendOtpInput): Promise<MailDeliveryResult> {
		const subject = "O teu código de acesso Muxima";
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `O teu código de acesso é ${input.otp}. É válido durante 5 minutos.`,
			title: "Código de acesso",
			description:
				"Utiliza este código para iniciar sessão na tua conta Muxima. O código é válido durante 5 minutos.",
			content: otpCodeBlock(input.otp),
			text: `Código de acesso: ${input.otp}\nVálido durante 5 minutos.`,
			footerNote:
				"Se não pediste este código, ignora este e-mail — a tua conta não está em risco.",
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Security alert after the password is changed. */
	async sendPasswordChanged(
		input: SendPasswordChangedInput,
	): Promise<MailDeliveryResult> {
		const subject = "A tua palavra-passe foi alterada";
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: "Alerta de segurança: a tua palavra-passe foi alterada.",
			title: "Palavra-passe alterada",
			description: `${greeting(input.name)}\n\nA palavra-passe da tua conta Muxima foi alterada${input.ip ? ` a partir do endereço IP ${input.ip}` : ""} em ${input.at.toLocaleString("pt-PT")}.`,
			content: infoBox(
				"Se não foste tu, altera novamente a tua palavra-passe e contacta o suporte.",
			),
			footerNote: "Alerta de segurança",
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Notification that the account was blocked. */
	async sendAccountBlocked(
		input: SendAccountBlockedInput,
	): Promise<MailDeliveryResult> {
		const subject = "A tua conta foi bloqueada";
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: "Notificação: a tua conta Muxima foi bloqueada.",
			title: "Conta bloqueada",
			description: `${greeting(input.name)}\n\nA tua conta Muxima foi bloqueada. Já não é possível iniciar sessão até esta ser reativada.`,
			content: input.reason
				? detailList([{ label: "Motivo", value: input.reason }])
				: undefined,
			footerNote: "Contacta o suporte para pedir o desbloqueio.",
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Notification that the account was unblocked. */
	async sendAccountUnblocked(
		input: SendAccountUnblockedInput,
	): Promise<MailDeliveryResult> {
		const subject = "A tua conta foi desbloqueada";
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: "Notificação: a tua conta Muxima foi reativada.",
			title: "Conta desbloqueada",
			description: `${greeting(input.name)}\n\nA tua conta Muxima foi desbloqueada e já podes voltar a iniciar sessão.`,
			footerNote: "Bem-vindo de volta a Muxima.",
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Notify every affected user of a budget target change. */
	async sendBudgetChanged(
		input: SendBudgetChangedInput,
	): Promise<MailDeliveryResult> {
		const subject = `Orçamento atualizado — ${input.eventName}`;
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `O orçamento do evento ${input.eventName} foi atualizado.`,
			title: "Orçamento atualizado",
			description: `${greeting()}\n\nO orçamento do evento "${input.eventName}"${input.actorName ? ` foi atualizado por ${input.actorName}` : " foi atualizado"}.`,
			content: detailList([
				{ label: "Evento", value: input.eventName },
				{ label: "Orçamento planeado", value: formatAoa(input.plannedCents) },
				{ label: "Reserva", value: formatAoa(input.reserveCents) },
			]),
			cta: { label: "Ver orçamento", url: input.budgetUrl },
			footerNote: `Evento: ${input.eventName}`,
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Inform a user of the permissions granted by their new role. */
	async sendPermissionsChanged(
		input: SendPermissionsChangedInput,
	): Promise<MailDeliveryResult> {
		const subject = `As tuas permissões foram atualizadas — ${input.eventName}`;
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `O teu papel no evento ${input.eventName} é agora ${input.roleLabel}.`,
			title: "Permissões atualizadas",
			description: `${greeting(input.name)}\n\nO teu papel no evento "${input.eventName}" é agora ${input.roleLabel}, com as seguintes permissões:`,
			content: bulletList(input.permissionLabels),
			cta: { label: "Ver evento", url: input.eventUrl },
			footerNote: `Evento: ${input.eventName}`,
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/** Ownership transfer — tailored copy for the new and the previous owner. */
	async sendOwnershipChanged(
		input: SendOwnershipChangedInput,
	): Promise<MailDeliveryResult> {
		const subject = input.isNewOwner
			? `Passas a ser o proprietário — ${input.eventName}`
			: `Deixaste de ser o proprietário — ${input.eventName}`;

		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: subject,
			title: input.isNewOwner
				? "Novo proprietário do evento"
				: "Propriedade do evento transferida",
			description: input.isNewOwner
				? `${greeting(input.name)}\n\nAgora és o proprietário do evento "${input.eventName}"${input.previousOwnerName ? `, que foi transferido por ${input.previousOwnerName}` : ""}.`
				: `${greeting(input.name)}\n\nDeixaste de ser o proprietário do evento "${input.eventName}"${input.newOwnerName ? ` — a propriedade foi transferida para ${input.newOwnerName}` : ""}. Continuas membro da equipa.`,
			cta: { label: "Abrir evento", url: input.eventUrl },
			footerNote: `Evento: ${input.eventName}`,
		});

		return deliverMail({ to: input.to, subject, html, text });
	},

	/**
	 * Confirms the e-mail address of a freshly created account. Wired to Better
	 * Auth's `emailVerification.sendVerificationEmail`; the link is one-time and
	 * expires — the account stays inactive until it is followed.
	 */
	async sendEmailVerification(
		input: SendEmailVerificationInput,
	): Promise<MailDeliveryResult> {
		const subject = "Confirma o teu e-mail Muxima";
		const { html, text } = renderBaseEmail({
			to: input.to,
			subject,
			preheader: `Confirma o teu e-mail para ativar a conta Muxima. O link é válido durante ${input.expiresInMinutes} minutos.`,
			title: "Confirma o teu e-mail",
			description: `${greeting(input.name)}\n\nConfirma este endereço de e-mail para ativares a tua conta Muxima. O link é válido durante ${input.expiresInMinutes} minutos e só pode ser utilizado uma vez.`,
			cta: { label: "Confirmar e-mail", url: input.verifyUrl },
			content: infoBox("Se não criaste uma conta Muxima, ignora este e-mail."),
			footerNote: "Confirmação de conta",
		});

		return deliverMail({ to: input.to, subject, html, text });
	},
};
