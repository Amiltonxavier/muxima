import {
	addDays,
	addHours,
	addMinutes,
	addMonths,
	addWeeks,
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	formatDistance,
	formatDistanceToNow,
	formatISO,
	isAfter,
	isBefore,
	isEqual,
	isSameDay,
	isSameMonth,
	isSameWeek,
	isValid as isValidDate,
	parse,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { pt } from "date-fns/locale";

export const HOUR_PX = 56;

const MINUTES_IN_DAY = 24 * 60;

type DateInput = Date | string;

/**
 * Helper utilitário para manipulação e formatação de datas (pt-PT).
 */
export const dateHelper = {
	// ---------------------------------------------------------------------------
	// PARSING / NORMALIZAÇÃO
	// ---------------------------------------------------------------------------

	/**
	 * Normaliza Date | string para Date.
	 * Retorna null quando a data é inválida.
	 */
	getDate(date?: DateInput | null): Date | null {
		if (!date) return null;

		const parsed = typeof date === "string" ? parseISO(date) : date;

		return isValidDate(parsed) ? parsed : null;
	},

	/**
	 * Retorna uma Date válida.
	 * Usa a data atual como fallback.
	 */
	resolve(date?: DateInput | null): Date {
		return this.getDate(date) ?? new Date();
	},

	/**
	 * Converte string local (dd/MM/yyyy) para Date.
	 */
	fromLocalString(dateStr: string): Date {
		return parse(dateStr, "dd/MM/yyyy", new Date());
	},

	/**
	 * Converte para ISO.
	 */
	toISO(date: DateInput): string {
		return formatISO(this.resolve(date));
	},

	// ---------------------------------------------------------------------------
	// FORMATAÇÃO
	// ---------------------------------------------------------------------------

	/**
	 * Ex: 16/06/2025
	 */
	formatShort(date: DateInput): string {
		return format(this.resolve(date), "dd/MM/yyyy", { locale: pt });
	},

	/**
	 * Ex: 16 jun 2025
	 */
	formatMedium(date: DateInput): string {
		return format(this.resolve(date), "dd MMM yyyy", { locale: pt });
	},

	/**
	 * Ex: 16 de junho de 2025 às 14:00
	 */
	formatFull(date: DateInput): string {
		return format(this.resolve(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
			locale: pt,
		});
	},

	/**
	 * Formatação personalizada.
	 */
	formatCustom(date: DateInput, pattern: string): string {
		return format(this.resolve(date), pattern, { locale: pt });
	},

	/**
	 * Ex: há 3 dias
	 */
	formatRelativeToNow(date: DateInput): string {
		return formatDistanceToNow(this.resolve(date), {
			addSuffix: true,
			locale: pt,
		});
	},

	/**
	 * Distância entre duas datas.
	 */
	formatRelative(from: DateInput, to: DateInput): string {
		return formatDistance(this.resolve(from), this.resolve(to), {
			locale: pt,
		});
	},

	/**
	 * Ex: 16/06/2025 14:30
	 */
	formatDateTime(date: DateInput): string {
		return format(this.resolve(date), "dd/MM/yyyy HH:mm", {
			locale: pt,
		});
	},

	/**
	 * Ex: 14:30
	 */
	formatTime(date: DateInput): string {
		return format(this.resolve(date), "HH:mm", {
			locale: pt,
		});
	},

	/**
	 * Ex: junho de 2025
	 */
	formatMonthYear(date: DateInput): string {
		return format(this.resolve(date), "MMMM 'de' yyyy", {
			locale: pt,
		});
	},

	/**
	 * Ex: segunda-feira, 23 de junho de 2026 às 14:30
	 */
	formatToStandardDate(date: DateInput): string {
		return format(this.resolve(date), "PPPPp", {
			locale: pt,
		});
	},

	/**
	 * Ex: 2026-06-23
	 */
	formatToIsoDate(date: DateInput): string {
		return format(this.resolve(date), "yyyy-MM-dd");
	},

	/**
	 * Nome curto do dia.
	 * Ex: seg
	 */
	formatWeekdayShort(date: Date): string {
		return format(date, "EEE", { locale: pt });
	},

	/**
	 * Dia do mês.
	 * Ex: 25
	 */
	formatDayNumber(date: Date): string {
		return format(date, "d");
	},

	/**
	 * Retorna o dia e o mês.
	 * Ex: 16/06
	 */
	formatDayMonth(date: DateInput): string {
		return format(this.resolve(date), "dd/MM");
	},
	/**
	 * Retorna o dia e o mês por extenso.
	 * Ex: 16 jun
	 */
	formatDayMonthShort(date: DateInput): string {
		return format(this.resolve(date), "dd MMM", {
			locale: pt,
		});
	},

	// ---------------------------------------------------------------------------
	// ESTADO DA DATA
	// ---------------------------------------------------------------------------

	/**
	 * Verifica se a data é válida.
	 */
	isValid(date?: DateInput | null): boolean {
		return this.getDate(date) !== null;
	},

	/**
	 * Verifica se a data é hoje.
	 */
	isToday(date: DateInput): boolean {
		const parsed = this.getDate(date);

		return parsed ? isSameDay(parsed, new Date()) : false;
	},

	/**
	 * Verifica se a data é amanhã.
	 */
	isTomorrow(date: DateInput): boolean {
		const parsed = this.getDate(date);

		if (!parsed) return false;

		return isSameDay(parsed, addDays(new Date(), 1));
	},

	/**
	 * Verifica se a data é ontem.
	 */
	isYesterday(date: DateInput): boolean {
		const parsed = this.getDate(date);

		if (!parsed) return false;

		return isSameDay(parsed, addDays(new Date(), -1));
	},

	/**
	 * Verifica se a data já passou.
	 */
	isPast(date: DateInput): boolean {
		const parsed = this.getDate(date);

		return parsed ? isBefore(parsed, new Date()) : false;
	},

	/**
	 * Verifica se a data é futura.
	 */
	isFuture(date: DateInput): boolean {
		const parsed = this.getDate(date);

		return parsed ? isAfter(parsed, new Date()) : false;
	},

	/**
	 * Verifica se duas datas são iguais.
	 */
	isEqual(date1: DateInput, date2: DateInput): boolean {
		const d1 = this.getDate(date1);
		const d2 = this.getDate(date2);

		if (!d1 || !d2) return false;

		return isEqual(d1, d2);
	},

	/**
	 * Verifica se duas datas pertencem ao mesmo dia.
	 */
	isSameDay(date1: DateInput, date2: DateInput): boolean {
		const d1 = this.getDate(date1);
		const d2 = this.getDate(date2);

		if (!d1 || !d2) return false;

		return isSameDay(d1, d2);
	},

	/**
	 * Verifica se duas datas pertencem ao mesmo mês.
	 */
	isSameMonth(date1: DateInput, date2: DateInput): boolean {
		const d1 = this.getDate(date1);
		const d2 = this.getDate(date2);

		if (!d1 || !d2) return false;

		return isSameMonth(d1, d2);
	},

	/**
	 * Verifica se duas datas pertencem à mesma semana.
	 */
	isSameWeek(date1: DateInput, date2: DateInput): boolean {
		const d1 = this.getDate(date1);
		const d2 = this.getDate(date2);

		if (!d1 || !d2) return false;

		return isSameWeek(d1, d2, { weekStartsOn: 1 });
	},

	// ---------------------------------------------------------------------------
	// EXPIRAÇÃO
	// ---------------------------------------------------------------------------

	/**
	 * Verifica se uma data já expirou.
	 *
	 * Ex:
	 * dateHelper.isExpired("2026-08-20")
	 * => true
	 */
	isExpired(date: DateInput): boolean {
		return this.isPast(date);
	},

	/**
	 * Verifica se uma data está prestes a expirar.
	 *
	 * @param date Data de expiração
	 * @param days Número de dias considerados como "em breve"
	 *
	 * Ex:
	 * isExpiringSoon("2026-08-30", 7)
	 */
	isExpiringSoon(date: DateInput, days = 7): boolean {
		const parsed = this.getDate(date);

		if (!parsed || this.isExpired(parsed)) {
			return false;
		}

		const limit = addDays(new Date(), days);

		return isBefore(parsed, limit) || isEqual(parsed, limit);
	},

	/**
	 * Verifica se a data expira hoje.
	 */
	expiresToday(date: DateInput): boolean {
		const parsed = this.getDate(date);

		return parsed ? isSameDay(parsed, new Date()) : false;
	},

	/**
	 * Retorna quantos dias faltam para a expiração.
	 *
	 * Pode retornar valor negativo quando já expirou.
	 */
	daysUntilExpiration(date: DateInput): number {
		const parsed = this.getDate(date);

		if (!parsed) return 0;

		const now = new Date();

		return Math.ceil(
			(parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);
	},

	/**
	 * Verifica se uma data está dentro de um intervalo de dias.
	 */
	isWithinDays(date: DateInput, days: number): boolean {
		const parsed = this.getDate(date);

		if (!parsed) return false;

		const now = new Date();
		const limit = addDays(now, days);

		return parsed >= now && parsed <= limit;
	},

	// ---------------------------------------------------------------------------
	// COMPARAÇÃO
	// ---------------------------------------------------------------------------

	/**
	 * Compara duas datas.
	 *
	 * @returns -1 | 0 | 1
	 */
	compare(date1: DateInput, date2: DateInput): number {
		const d1 = this.getDate(date1);
		const d2 = this.getDate(date2);

		if (!d1 || !d2) return 0;

		if (d1.getTime() < d2.getTime()) return -1;
		if (d1.getTime() > d2.getTime()) return 1;

		return 0;
	},

	// ---------------------------------------------------------------------------
	// ARITMÉTICA
	// ---------------------------------------------------------------------------

	/**
	 * Data atual.
	 */
	now(): Date {
		return new Date();
	},

	/**
	 * Hoje + 7 dias.
	 */
	afterSevenDays(): Date {
		return addDays(new Date(), 7);
	},

	/**
	 * Adiciona dias.
	 */
	addDays(date: DateInput, amount: number): Date {
		return addDays(this.resolve(date), amount);
	},

	/**
	 * Adiciona semanas.
	 */
	addWeeks(date: DateInput, amount: number): Date {
		return addWeeks(this.resolve(date), amount);
	},

	/**
	 * Adiciona meses.
	 */
	addMonths(date: DateInput, amount: number): Date {
		return addMonths(this.resolve(date), amount);
	},

	/**
	 * Adiciona horas.
	 */
	addHours(date: DateInput, amount: number): Date {
		return addHours(this.resolve(date), amount);
	},

	/**
	 * Adiciona minutos.
	 */
	addMinutes(date: DateInput, amount: number): Date {
		return addMinutes(this.resolve(date), amount);
	},

	// ---------------------------------------------------------------------------
	// INÍCIO / FIM DE PERÍODOS
	// ---------------------------------------------------------------------------

	/**
	 * Início do dia.
	 */
	startOfDay(date: DateInput): Date {
		return startOfDay(this.resolve(date));
	},

	/**
	 * Fim do dia.
	 */
	endOfDay(date: DateInput): Date {
		return endOfDay(this.resolve(date));
	},

	/**
	 * Início da semana (segunda-feira).
	 */
	startOfWeek(date: DateInput): Date {
		return startOfWeek(this.resolve(date), {
			weekStartsOn: 1,
		});
	},

	/**
	 * Fim da semana (domingo).
	 */
	endOfWeek(date: DateInput): Date {
		return endOfWeek(this.resolve(date), {
			weekStartsOn: 1,
		});
	},

	/**
	 * Início do mês.
	 */
	startOfMonth(date: DateInput): Date {
		return startOfMonth(this.resolve(date));
	},

	/**
	 * Fim do mês.
	 */
	endOfMonth(date: DateInput): Date {
		return endOfMonth(this.resolve(date));
	},

	// ---------------------------------------------------------------------------
	// INTERVALOS
	// ---------------------------------------------------------------------------

	/**
	 * Retorna o range do mês atual.
	 */
	getCurrentMonthRange(): {
		from: string;
		to: string;
	} {
		const today = new Date();

		return {
			from: format(startOfMonth(today), "yyyy-MM-dd"),
			to: format(endOfMonth(today), "yyyy-MM-dd"),
		};
	},

	/**
	 * Retorna o range da semana atual.
	 */
	getCurrentWeekRange(): {
		from: string;
		to: string;
	} {
		const today = new Date();

		return {
			from: format(this.startOfWeek(today), "yyyy-MM-dd"),
			to: format(this.endOfWeek(today), "yyyy-MM-dd"),
		};
	},

	// ---------------------------------------------------------------------------
	// CALENDÁRIO / GRELHA
	// ---------------------------------------------------------------------------

	/**
	 * Minutos decorridos desde a meia-noite.
	 */
	minutesOfDay(date: Date): number {
		return date.getHours() * 60 + date.getMinutes();
	},

	/**
	 * Converte minutos para pixels.
	 */
	minutesToPx(minutes: number): number {
		return minutes * (HOUR_PX / 60);
	},

	/**
	 * Converte posição vertical em minutos.
	 */
	yToMinutes(y: number, containerHeight: number): number {
		if (containerHeight <= 0) return 0;

		const ratio = y / containerHeight;

		return Math.min(Math.max(ratio * MINUTES_IN_DAY, 0), MINUTES_IN_DAY);
	},

	/**
	 * Linhas das horas da grelha (0-24).
	 */
	hourLines(): number[] {
		return Array.from({ length: 25 }, (_, i) => i);
	},

	/**
	 * Retorna os 7 dias da semana.
	 */
	weekDays(date: Date): Date[] {
		const start = startOfWeek(date, {
			weekStartsOn: 1,
		});

		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	},
};
