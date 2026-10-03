import { toast } from "sonner";
import {
	type ApiErrorInfo,
	type ApiValidationIssue,
	GENERIC_ERROR_MESSAGE,
	parseApiError,
} from "./parse-api-error";

/**
 * Minimal surface a form must expose to receive API validation issues. Matches
 * TanStack Form (`useForm`) without importing it, so this helper stays usable
 * from plain handlers and from tests.
 */
export interface FormApiLike {
	setFieldMeta: (name: string, updater: (previous: unknown) => unknown) => void;
}

export interface HandleApiErrorOptions {
	/** Message used when the error carries nothing usable. */
	fallbackMessage?: string;
	/** When provided, field-level issues are attached to the form instead of the toast. */
	form?: FormApiLike;
	/** Extra options forwarded to the toast (e.g. `id` to dedupe). */
	toastOptions?: Parameters<typeof toast.error>[1];
}

/**
 * The single place where an API failure becomes user feedback.
 *
 * Everything (TanStack Query's `QueryCache`/`MutationCache`, form submit
 * handlers, Better Auth calls, `fetch` based downloads) goes through here, so
 * the app can never show a raw `error.message`, an English string or an
 * untranslated library message.
 */
export function handleApiError(
	error: unknown,
	options: HandleApiErrorOptions = {},
): ApiErrorInfo {
	const info = parseApiError(error);

	// The fallback only replaces the generic message: a real API message is
	// always more specific and already PT-PT.
	const message =
		options.fallbackMessage && info.message === GENERIC_ERROR_MESSAGE
			? options.fallbackMessage
			: info.message;

	if (options.form) {
		const issues = info.details?.issues;
		if (Array.isArray(issues) && issues.length > 0) {
			applyApiValidationErrors(options.form, issues);
			// The issues are rendered inline, next to each field: repeating them in
			// a toast would duplicate what the user is already reading.
			return info;
		}
	}

	toast.error(message, options.toastOptions);

	return info;
}

/**
 * Maps the API's `details.issues` onto the form fields.
 *
 * Paths arrive dot-joined (`company.address`); nested forms can use the same
 * key TanStack Form expects for dotted field names.
 */
export function applyApiValidationErrors(
	form: FormApiLike,
	issues: ApiValidationIssue[],
): void {
	for (const issue of issues) {
		if (issue.path === "*") continue;
		const message = issue.message?.trim();
		if (!message) continue;
		form.setFieldMeta(issue.path, (previous) => ({
			...(previous as Record<string, unknown>),
			errorMap: {
				...((previous as { errorMap?: Record<string, string> })?.errorMap ??
					{}),
				onSubmit: message,
			},
		}));
	}
}
