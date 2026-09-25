export class StringHelper {
	/**
	 * Junta uma lista de strings removendo espaços vazios
	 */
	static join(...values: (string | undefined | null)[]): string {
		return values
			.filter(Boolean)
			.map((value) => value?.trim())
			.filter(Boolean)
			.join(" ");
	}

	/**
	 * Junta primeiro e último nome
	 */
	static fullName(firstName?: string | null, lastName?: string | null): string {
		return this.join(firstName, lastName);
	}

	/**
	 * Retorna iniciais do nome
	 * Ex: Pedro Quinjengue => PQ
	 */
	static initials(name?: string | null, limit = 2): string {
		if (!name) return "";

		return name
			.trim()
			.split(/\s+/)
			.map((word) => word.charAt(0))
			.slice(0, limit)
			.join("")
			.toUpperCase();
	}

	/**
	 * Capitaliza uma string
	 * Ex: pedro => Pedro
	 */
	static capitalize(value?: string | null): string {
		if (!value) return "";

		return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
	}

	/**
	 * Capitaliza cada palavra
	 * Ex: pedro quinjengue => Pedro Quinjengue
	 */
	static capitalizeWords(value?: string | null): string {
		if (!value) return "";

		return value
			.split(" ")
			.map((word) => this.capitalize(word))
			.join(" ");
	}

	/**
	 * Remove espaços duplicados
	 */
	static normalize(value?: string | null): string {
		if (!value) return "";

		return value.trim().replace(/\s+/g, " ");
	}

	/**
	 * Trunca string
	 */
	static truncate(value?: string | null, length = 20): string {
		if (!value) return "";

		if (value.length <= length) {
			return value;
		}

		return `${value.substring(0, length)}...`;
	}

	/**
	 * Verifica se string está vazia
	 */
	static isEmpty(value?: string | null): boolean {
		return !value || value.trim().length === 0;
	}

	/**
	 * Converte string para slug
	 * Ex: Pedro Quinjengue => pedro-quinjengue
	 */
	static slug(value?: string | null): string {
		if (!value) return "";

		return value
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim()
			.replace(/\s+/g, "-")
			.replace(/[^\w-]+/g, "");
	}
}
