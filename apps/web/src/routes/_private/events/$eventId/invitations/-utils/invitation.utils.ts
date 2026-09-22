export function buildInvitationLink(code: string) {
	return `${window.location.origin}/invite/${code}`;
}