/**
 * @muxima/mail — transactional e-mail layer.
 *
 * Public surface: the `MailService` façade (one typed method per e-mail kind),
 * the renderer's content helpers, and the raw `deliverMail` escape hatch with
 * its result type. Consumers never import `nodemailer`.
 */
export {
	deliverMail,
	getTransporter,
	resetTransporterForTests,
} from "./client/mailer";
export { buildMailerConfig, mailFrom } from "./config/mailer-config";
export type {
	SendAccountBlockedInput,
	SendAccountUnblockedInput,
	SendBudgetChangedInput,
	SendEmailVerificationInput,
	SendEventInvitationInput,
	SendMemberInvitationInput,
	SendOwnershipChangedInput,
	SendPasswordChangedInput,
	SendPermissionsChangedInput,
} from "./services/mail-service";
export {
	formatAoa,
	MailService,
	type SendOtpInput,
} from "./services/mail-service";
export {
	bulletList,
	detailList,
	escapeHtml,
	infoBox,
	otpCodeBlock,
	renderBaseEmail,
} from "./templates/base-template";
export type {
	BaseMailContext,
	MailDeliveryResult,
	MailFailureCode,
	MailMessage,
} from "./types/mail.types";
