/**
 * Public types of the mail layer.
 *
 * A consumer never handles a `nodemailer` object: it passes plain domain data
 * to a `MailService` method and receives a `MailDeliveryResult` that is always
 * safe to ignore — a delivery failure never throws.
 */

/** Outcome of a delivery attempt. Business code can treat it as fire-and-forget. */
export type MailDeliveryResult =
	| {
			ok: true;
			messageId?: string;
			/** Recipients the server accepted (`RCPT TO` → 250). */
			accepted: string[];
			/** Recipients the server rejected (`RCPT TO` → 5xx). */
			rejected: string[];
	  }
	| { ok: false; code: MailFailureCode };

/**
 * Why a mail was not delivered.
 *
 * `SMTP_NOT_CONFIGURED` is not an error state: it is the expected behaviour in
 * environments without `MAIL_HOST` (e.g. local dev before SMTP is added).
 * `SMTP_NO_RECIPIENTS` means the transport resolved but the server accepted no
 * recipient at all — a delivery failure even though `sendMail()` did not throw.
 */
export type MailFailureCode =
	| "SMTP_NOT_CONFIGURED"
	| "SMTP_FAILED"
	| "SMTP_NO_RECIPIENTS";

/** A fully rendered message, ready for the transport. */
export type MailMessage = {
	to: string;
	subject: string;
	html: string;
	/** Plain-text fallback kept in sync by the renderer. */
	text: string;
};

/**
 * Everything the base template needs. Every concrete mail service composes one
 * of these from domain data — the HTML layout is never duplicated per mail.
 */
export type BaseMailContext = {
	/** Recipient e-mail. */
	to: string;
	/** E-mail subject line (also used for the `<title>`). */
	subject: string;
	/** Hidden preview text shown next to the subject in the client inbox. */
	preheader: string;
	/** Main heading of the body (`<h1>`). */
	title: string;
	/** Lead paragraph under the title. */
	description?: string;
	/** Extra HTML block (trusted markup built by this package's own helpers,
	 * e.g. `otpCodeBlock`, `detailList` — always with escaped values). */
	content?: string;
	/** Plain-text counterpart of `content`, used for the `.text` fallback. */
	text?: string;
	/** Primary call to action. */
	cta?: { label: string; url: string };
	/** Secondary, quieter call to action (e.g. "Recusar convite"). */
	secondaryCta?: { label: string; url: string };
	/** Contextual line above the footer (e.g. event name or warning). */
	footerNote?: string;
};
