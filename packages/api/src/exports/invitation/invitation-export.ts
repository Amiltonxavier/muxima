import { generateInvitationQrCodePng } from "../../modules/invitations/qr-code";
import type { PublicInvitationLookup } from "../../shared/types/entities";
import { renderInvitationPdf } from "../core/pdf/invitation/invitation-pdf";

/**
 * Invitation PDF is a standalone, elegant layout (separate from administrative
 * reports). This builder returns the PDF buffer directly rather than going
 * through the ReportDefinition → administrative PDF renderer.
 */

export type BuildInvitationPdfInput = {
	lookup: PublicInvitationLookup;
	schedule: {
		title: string;
		description: string | null;
		startAt: Date;
		endAt: Date | null;
		location: string | null;
	}[];
	generatedAt: Date;
};

export async function buildInvitationPdf(
	input: BuildInvitationPdfInput,
): Promise<Buffer> {
	if (input.lookup.result !== "AVAILABLE") {
		return renderInvitationPdf({
			lookup: input.lookup,
			schedule: input.schedule,
			qrPng: null,
			generatedAt: input.generatedAt,
		});
	}

	const invitation = input.lookup.invitation;
	let qrPng: string | null = null;
	if (invitation.qrCode && invitation.url) {
		try {
			qrPng = await generateInvitationQrCodePng(invitation.url);
		} catch {
			qrPng = null;
		}
	}

	return renderInvitationPdf({
		lookup: input.lookup,
		schedule: input.schedule,
		qrPng,
		generatedAt: input.generatedAt,
	});
}
