export function formatPhone(phone: string): string {
	const cleaned = phone.replace(/\D/g, "");
	if (cleaned.length === 9) {
		return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
	}
	return phone;
}

export function formatPhoneWithCountryCode(
	phone: string,
	countryCode = "244",
): string {
	const cleaned = phone.replace(/\D/g, "");
	if (cleaned.startsWith(countryCode)) {
		return `+${countryCode} ${cleaned.slice(countryCode.length)}`;
	}
	return `+${countryCode} ${cleaned}`;
}
