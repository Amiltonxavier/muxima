import type { BaseMailContext } from "../types/mail.types";

/**
 * Muxima base e-mail template.
 *
 * One layout, reused by every mail service — the services only feed data into
 * `renderBaseEmail`, so the HTML/CSS below cannot drift per mail type.
 *
 * Conventions:
 *  - table-based layout + inline styles (the most compatible with mail
 *    clients, where `<style>` and flex often fail);
 *  - 600px reading width, fluid on mobile;
 *  - brand: Muxima gold `#C89D48` on warm background `#F6EFE3`;
 *  - every dynamic text value is escaped; `content` is trusted markup built
 *    by the helpers below from escaped values.
 */

const BRAND = "#C89D48";
const BRAND_ON_GOLD = "#2A2418";
const INK = "#2A2418";
const MUTED = "#7A7161";
const BODY_BG = "#F6EFE3";
const CARD_BG = "#FFFFFF";
const DIVIDER = "#EDE3CE";

const FONT_STACK =
	'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Escape a dynamic text value so nobody injects markup through a field. */
export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

/** Wrap an output-only value safe for attribute position. */
function escapeAttr(value: string): string {
	return escapeHtml(value).replaceAll("`", "&#96;");
}

// ── Reusable building blocks (subject/title/description/action/content) ──────

function titleBlock(title: string): string {
	return `
		<tr>
			<td style="padding:0 40px 8px 40px;">
				<h1 style="margin:0; color:${INK}; font-family:${FONT_STACK}; font-size:26px; line-height:1.3; font-weight:700;">
					${escapeHtml(title)}
				</h1>
			</td>
		</tr>`;
}

function descriptionBlock(description: string): string {
	return `
		<tr>
			<td style="padding:0 40px 20px 40px;">
				<p style="margin:0; color:${MUTED}; font-family:${FONT_STACK}; font-size:15px; line-height:1.65;">
					${escapeHtml(description)}
				</p>
			</td>
		</tr>`;
}

function contentBlock(content: string): string {
	return `
		<tr>
			<td style="padding:0 40px 24px 40px;">${content}</td>
		</tr>`;
}

function primaryCtaBlock(cta: { label: string; url: string }): string {
	return `
		<tr>
			<td style="padding:0 40px 24px 40px;" align="center">
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
					<tr>
						<td style="border-radius:999px; background:${BRAND};">
							<a href="${escapeAttr(cta.url)}" style="display:inline-block; padding:13px 32px; border-radius:999px; font-family:${FONT_STACK}; font-size:14px; font-weight:700; line-height:1; color:${BRAND_ON_GOLD}; text-decoration:none; white-space:nowrap;">
								${escapeHtml(cta.label)}
							</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>`;
}

function secondaryCtaBlock(cta: { label: string; url: string }): string {
	return `
		<tr>
			<td style="padding:0 40px 6px 40px;" align="center">
				<a href="${escapeAttr(cta.url)}" style="display:inline-block; padding:11px 28px; border:1px solid ${DIVIDER}; border-radius:999px; font-family:${FONT_STACK}; font-size:13px; font-weight:600; line-height:1; color:${MUTED}; text-decoration:none; white-space:nowrap;">
					${escapeHtml(cta.label)}
				</a>
			</td>
		</tr>`;
}

function footerBlock(footerNote?: string): string {
	return `
		<tr>
			<td style="background:${BODY_BG}; border-top:1px solid ${DIVIDER}; border-radius:0 0 12px 12px; padding:24px 40px 28px 40px;">
				${footerNote ? `<p style="margin:0 0 12px 0; color:${INK}; font-family:${FONT_STACK}; font-size:13px; line-height:1.55; font-weight:600;">${escapeHtml(footerNote)}</p>` : ""}
				<p style="margin:0; color:${MUTED}; font-family:${FONT_STACK}; font-size:12px; line-height:1.6;">
					<span style="font-weight:700; color:${INK};">Muxima</span> · Gestão de eventos<br/>
					Este e-mail foi enviado pela plataforma Muxima. Se não esperavas esta
					mensagem, podes simplesmente ignorá-la.<br/>
					© ${new Date().getFullYear()} Muxima
				</p>
			</td>
		</tr>`;
}

function headerBlock(): string {
	return `
		<tr>
			<td style="border-top:4px solid ${BRAND}; background:${CARD_BG}; border-radius:12px 12px 0 0; padding:28px 40px 24px 40px;">
				<table role="presentation" cellpadding="0" cellspacing="0" border="0">
					<tr>
						<td style="vertical-align:middle;">
							<span style="display:inline-block; width:34px; height:34px; border-radius:9px; background:${BRAND}; color:${BRAND_ON_GOLD}; font-family:${FONT_STACK}; font-size:19px; font-weight:800; line-height:34px; text-align:center;">M</span>
						</td>
						<td style="vertical-align:middle; padding-left:12px;">
							<span style="font-family:${FONT_STACK}; font-size:17px; font-weight:800; letter-spacing:-0.02em; color:${INK};">Muxima</span>
						</td>
					</tr>
				</table>
			</td>
		</tr>`;
}

/**
 * Render the full e-mail for one context. Returns both HTML and a plain-text
 * fallback so the same data travels in every channel.
 */
export function renderBaseEmail(context: BaseMailContext): {
	html: string;
	text: string;
} {
	const html = `
<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(context.subject)}</title>
</head>
<body style="margin:0; padding:0; word-spacing:normal; background-color:${BODY_BG};">
	<span style="display:none !important; visibility:hidden; mso-hide:all; font-size:1px; color:${BODY_BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; height:0px;">${escapeHtml(context.preheader)}</span>
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BODY_BG}" style="background-color:${BODY_BG};">
		<tr>
			<td align="center" style="padding:28px 12px;">
				<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:100%;">
					<tr>
						<td style="background:${CARD_BG}; border-radius:12px; box-shadow:0 8px 24px rgba(42,36,24,0.06);">
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
								${headerBlock()}
								${titleBlock(context.title)}
								${context.description ? descriptionBlock(context.description) : ""}
								${context.content ? contentBlock(context.content) : ""}
								${context.cta ? primaryCtaBlock(context.cta) : ""}
								${context.secondaryCta ? secondaryCtaBlock(context.secondaryCta) : ""}
								<tr><td style="height:12px; font-size:0; line-height:0;">&nbsp;</td></tr>
								${footerBlock(context.footerNote)}
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;

	const lines = [
		context.title,
		"",
		context.description,
		context.text,
		"",
		context.cta ? `${context.cta.label} → ${context.cta.url}` : "",
		context.secondaryCta
			? `${context.secondaryCta.label} → ${context.secondaryCta.url}`
			: "",
		context.footerNote,
	].filter((line): line is string => Boolean(line));

	return {
		html,
		text: lines.join("\n"),
	};
}

// ── Content helpers (the only builders that may create `content` HTML) ───────

/** Large monospace code block — used for the OTP. */
export function otpCodeBlock(code: string): string {
	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BODY_BG}; border:1px dashed ${BRAND}; border-radius:10px;">
			<tr>
				<td align="center" style="padding:22px 16px;">
					<span style="font-family:'SF Mono', 'Menlo', Consolas, 'Liberation Mono', monospace; font-size:34px; font-weight:800; letter-spacing:0.3em; color:${INK};">${escapeHtml(code)}</span>
				</td>
			</tr>
		</table>`;
}

/** Muted callout box (e.g. a security warning or a note). */
export function infoBox(text: string): string {
	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BODY_BG}; border-radius:10px;">
			<tr>
				<td style="padding:14px 16px; color:${MUTED}; font-family:${FONT_STACK}; font-size:13px; line-height:1.6;">
					${escapeHtml(text)}
				</td>
			</tr>
		</table>`;
}

/** Two-column list — label left, value right — used to show event/budget facts. */
export function detailList(
	rows: Array<{ label: string; value: string }>,
): string {
	const body = rows
		.map(
			(row, index) => `
			<tr>
				<td style="padding:${index === 0 ? "0" : "10px 0 0 0"}; color:${MUTED}; font-family:${FONT_STACK}; font-size:13px; line-height:1.5; vertical-align:top;">
					${escapeHtml(row.label)}
				</td>
				<td align="right" style="padding:${index === 0 ? "0" : "10px 0 0 0"}; color:${INK}; font-family:${FONT_STACK}; font-size:13px; line-height:1.5; vertical-align:top; font-weight:600; word-break:break-word;">
					${escapeHtml(row.value)}
				</td>
			</tr>`,
		)
		.join("");

	return `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${DIVIDER}; border-bottom:1px solid ${DIVIDER}; padding:2px 0;">
			${body}
		</table>`;
}

/** Bullet list of permissions (or any short items). */
export function bulletList(items: string[]): string {
	const lis = items
		.map(
			(item) =>
				`<tr><td style="padding:4px 0; color:${INK}; font-family:${FONT_STACK}; font-size:14px; line-height:1.5; vertical-align:top;"><span style="color:${BRAND}; font-weight:800; padding-right:8px;">•</span>${escapeHtml(item)}</td></tr>`,
		)
		.join("");

	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${lis}</table>`;
}
