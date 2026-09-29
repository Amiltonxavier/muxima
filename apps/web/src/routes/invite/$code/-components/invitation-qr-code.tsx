import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { InviteOrnament } from "./invite-ornament";

/**
 * QR Code of the public invitation.
 *
 * The SVG comes from the API (`GuestInvitation.qrCode`) and encodes
 * `GuestInvitation.url` — the same address the guest is currently reading.
 * Nothing is generated here so a scanned code always matches the live link.
 */
export function InvitationQrCode({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants?: Variants;
}) {
	if (!invitation.qrCode) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center gap-3 px-6 py-7 text-center"
		>
			<InviteOrnament />
			<p
				className="font-[family-name:var(--ip-display)] text-[0.7rem] uppercase tracking-[0.32em]"
				style={{ color: "var(--ip-ink-soft)" }}
			>
				Guarda este convite
			</p>
			<div
				className="rounded-[3px] border border-[color:var(--ip-line)] bg-white p-2.5 [&>svg]:h-full [&>svg]:w-full"
				style={{ width: 168, height: 168 }}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG produced by our own API from the invitation token only
				dangerouslySetInnerHTML={{ __html: invitation.qrCode }}
				role="img"
				aria-label="QR Code do convite"
			/>
			<p
				className="max-w-[15rem] text-[0.7rem] leading-relaxed"
				style={{ color: "var(--ip-ink-soft)" }}
			>
				Abre a câmara do telemóvel e aponta para o código — ou guarda o link
				para abrir mais tarde.
			</p>
			{invitation.url && (
				<p
					className="max-w-[17rem] truncate font-mono text-[0.62rem]"
					style={{ color: "var(--ip-ink-soft)" }}
				>
					{invitation.url}
				</p>
			)}
		</motion.section>
	);
}
