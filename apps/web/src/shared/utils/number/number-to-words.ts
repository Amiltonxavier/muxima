const UNITS = [
	{ value: 1_000_000_000, name: "mil milhões", one: "mil milhões" },
	{ value: 1_000_000, name: "milhões", one: "um milhão" },
	{ value: 1_000, name: "mil", one: "mil" },
];

const UNIDADES = [
	"zero",
	"um",
	"dois",
	"três",
	"quatro",
	"cinco",
	"seis",
	"sete",
	"oito",
	"nove",
	"dez",
	"onze",
	"doze",
	"treze",
	"catorze",
	"quinze",
	"dezasseis",
	"dezassete",
	"dezoito",
	"dezanove",
];

const DEZENAS = [
	"",
	"",
	"vinte",
	"trinta",
	"quarenta",
	"cinquenta",
	"sessenta",
	"setenta",
	"oitenta",
	"noventa",
];

const CENTENAS = [
	"",
	"cento",
	"duzentos",
	"trezentos",
	"quatrocentos",
	"quinhentos",
	"seiscentos",
	"setecentos",
	"oitocentos",
	"novecentos",
];

function twoDigits(n: number): string {
	if (n < 20) return UNIDADES[n] ?? "";
	const dezena = Math.floor(n / 10);
	const unidade = n % 10;
	return unidade === 0
		? (DEZENAS[dezena] ?? "")
		: `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`;
}

function threeDigits(n: number): string {
	const centena = Math.floor(n / 100);
	const resto = n % 100;
	if (centena === 0) return twoDigits(resto);
	const prefixo = n === 100 ? "cem" : (CENTENAS[centena] ?? "");
	if (resto === 0) return prefixo;
	return `${prefixo} e ${twoDigits(resto)}`;
}

function toWords(n: number): string {
	for (const unit of UNITS) {
		if (n >= unit.value) {
			const major = Math.floor(n / unit.value);
			const minor = n % unit.value;
			const majorText =
				major === 1 ? unit.one : `${toWords(major)} ${unit.name}`;
			return minor === 0
				? majorText
				: `${majorText} ${unit.value >= 1_000_000 ? "e " : ""}${toWords(minor)}`;
		}
	}
	return n === 100 ? "cem" : threeDigits(n);
}

/**
 * Número por extenso em português (até mil milhões).
 *
 * @example
 * numberToWords(1234); // "mil duzentos e trinta e quatro"
 */
export function numberToWords(value: number): string {
	if (!Number.isFinite(value)) return "";
	return (value < 0 ? "menos " : "") + toWords(Math.abs(Math.trunc(value)));
}
