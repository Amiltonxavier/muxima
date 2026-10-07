export function sanitizeReturnTo(
	returnTo: string,
	origin: string,
): string | null {
	if (!returnTo) return null;
	try {
		const candidate = returnTo;
		if (candidate.startsWith("//")) {
			return null;
		}
		if (
			/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate) &&
			!candidate.startsWith("/")
		) {
			return null;
		}
		const decoded = decodeURIComponent(candidate);
		const u = new URL(decoded, origin);
		if (u.origin !== origin) return null;
		if (!u.pathname.startsWith("/")) return null;
		const result = u.pathname + u.search + u.hash;
		return result;
	} catch {
		return null;
	}
}

export function buildLoginUrl(returnTo: string | null, origin: string): string {
	const safe = returnTo ? sanitizeReturnTo(returnTo, origin) : null;
	if (safe) {
		return `/login?returnTo=${encodeURIComponent(safe)}`;
	}
	return "/login";
}
