import {
	addDays,
	differenceInDays,
	format,
	formatDistanceToNow,
	isAfter,
	isBefore,
	startOfDay,
} from "date-fns";
import { pt } from "date-fns/locale";

export function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "dd MMM yyyy", { locale: pt });
}

export function formatDateShort(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "dd/MM/yyyy");
}

export function formatDateTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "dd MMM yyyy HH:mm", { locale: pt });
}

export function formatTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return format(d, "HH:mm");
}

export function getDaysRemaining(date: Date | string): number {
	const d = typeof date === "string" ? new Date(date) : date;
	return differenceInDays(d, startOfDay(new Date()));
}

export function isOverdue(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	return isBefore(d, startOfDay(new Date()));
}

export function isUpcoming(date: Date | string, days = 7): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const limit = addDays(startOfDay(new Date()), days);
	return isAfter(d, startOfDay(new Date())) && isBefore(d, limit);
}

export function formatRelativeTime(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return formatDistanceToNow(d, { addSuffix: true, locale: pt });
}
