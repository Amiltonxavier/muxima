import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

import { buildMailerConfig, mailFrom } from "../config/mailer-config";
import type { MailDeliveryResult, MailMessage } from "../types/mail.types";

/**
 * The ONLY place `nodemailer.sendMail()` is called in the whole monorepo.
 *
 * Everything else goes through `mailService.*` → `deliverMail`, which:
 *  - keeps a single lazily-created SMTP transporter;
 *  - never throws: a failing SMTP (or a missing `MAIL_HOST`) resolves to a
 *    `{ ok: false }` result with a structured log, so a non-critical e-mail
 *    can never take a business operation down with it;
 *  - logs failures consistently (event, recipient, subject, error).
 */
let transporter: Transporter | null | undefined;

export function getTransporter(): Transporter | null {
	if (transporter !== undefined) return transporter;

	const config = buildMailerConfig();
	transporter = config ? nodemailer.createTransport(config) : null;
	return transporter;
}

/** Test hook: drop the cached transporter so the next call rebuilds it. */
export function resetTransporterForTests(): void {
	transporter = undefined;
}

export async function deliverMail(
	message: MailMessage,
): Promise<MailDeliveryResult> {
	const smtp = getTransporter();

	if (!smtp) {
		logMail(
			"warn",
			"SMTP não configurado (MAIL_HOST ausente) — e-mail não enviado",
			message,
		);
		return { ok: false, code: "SMTP_NOT_CONFIGURED" };
	}

	try {
		const info = await smtp.sendMail({
			from: mailFrom(),
			to: message.to,
			subject: message.subject,
			html: message.html,
			text: message.text,
		});

		// `sendMail()` resolving does not mean the server took the message:
		// inspect the envelope so a rejected recipient is reported instead of
		// being silently swallowed as a success.
		const accepted = (info.accepted ?? []).map(String);
		const rejected = (info.rejected ?? []).map(String);

		if (accepted.length === 0) {
			logMail("error", "SMTP não aceitou nenhum destinatário", message, {
				messageId: info.messageId,
				accepted,
				rejected,
			});
			return { ok: false, code: "SMTP_NO_RECIPIENTS" };
		}

		if (rejected.length > 0) {
			logMail("warn", "SMTP recusou alguns destinatários", message, {
				messageId: info.messageId,
				accepted,
				rejected,
			});
		} else {
			logMail("info", "E-mail entregue ao servidor SMTP", message, {
				messageId: info.messageId,
			});
		}

		return { ok: true, messageId: info.messageId, accepted, rejected };
	} catch (error) {
		logMail(
			"error",
			"Falha ao enviar e-mail",
			message,
			smtpErrorDetails(error),
		);
		return { ok: false, code: "SMTP_FAILED" };
	}
}

/**
 * Extracts the fields that matter for diagnosis from a Nodemailer/SMTP error
 * (`code`, `responseCode`, `command`, `response`) without ever touching the
 * credentials, which live only in the transport config.
 */
function smtpErrorDetails(error: unknown): Record<string, unknown> {
	if (typeof error !== "object" || error === null) {
		return { message: String(error) };
	}
	const e = error as {
		code?: string;
		responseCode?: number;
		command?: string;
		response?: string;
		message?: string;
	};
	return {
		code: e.code,
		responseCode: e.responseCode,
		command: e.command,
		response: e.response,
		message: e.message,
	};
}

function logMail(
	level: "info" | "warn" | "error",
	message: string,
	mail: Pick<MailMessage, "to" | "subject">,
	details?: Record<string, unknown>,
): void {
	const entry = {
		event: "mail",
		to: mail.to,
		subject: mail.subject,
		at: new Date().toISOString(),
		...details,
	};
	if (level === "error") {
		console.error(`[mail] ${message}`, entry);
	} else if (level === "warn") {
		console.warn(`[mail] ${message}`, entry);
	} else {
		console.info(`[mail] ${message}`, entry);
	}
}
