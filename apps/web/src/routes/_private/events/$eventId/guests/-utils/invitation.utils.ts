export function buildInvitationMessage(
	guestName: string,
	invitationLink: string,
) {
	return `Olá ${guestName}! 🎉
Estás convidado(a) para o nosso evento!

Confirma a tua presença: ${invitationLink}`;
}

export function buildInvitationLink(code: string) {
	return `${window.location.origin}/invite/${code}`;
}
