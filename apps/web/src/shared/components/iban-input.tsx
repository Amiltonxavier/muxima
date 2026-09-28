import {
	formatIban,
	hasValidIbanChecksum,
	validateIban,
} from "@muxima/api/shared/validation/identifiers";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { cn } from "@muxima/ui/lib/utils";
import { useId } from "react";

interface IBANInputProps {
	/** Controlled value — raw digits/letters, any casing. */
	value: string;
	onChange: (value: string) => void;
	/** Show the helper text ("opcional") and skip required marking. */
	disabled?: boolean;
	id?: string;
	/** Rendered above the input; defaults to "IBAN". */
	label?: string;
	className?: string;
}

/**
 * IBAN input used wherever bank details are collected.
 *
 * Formatting and validation are encapsulated here (and in the shared
 * `identifiers` module, which the API also uses) — no regex spread across
 * forms. While typing, the value is pretty-printed in groups of four; the
 * `onChange` always receives the normalized value (no separators).
 *
 * Error display is deliberately tolerant: an incomplete IBAN shows the error
 * only once the user left the field (blur), so typing is not punished.
 */
export function IBANInput({
	value,
	onChange,
	disabled,
	id,
	label = "IBAN",
	className,
}: IBANInputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const errorId = `${inputId}-error`;

	const normalized = value.replace(/[\s-]/g, "").toUpperCase();
	const structureError = normalized ? validateIban(normalized) : null;
	const checksumError =
		!structureError && normalized && !hasValidIbanChecksum(normalized)
			? "O IBAN não passa na verificação de dígitos."
			: null;
	const error = structureError ?? checksumError;

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={inputId}>{label}</Label>
			<Input
				id={inputId}
				type="text"
				inputMode="numeric"
				autoComplete="off"
				spellCheck={false}
				placeholder="AO06 0000 0000 0000 0000 0000 0"
				value={formatIban(value)}
				onChange={(e) => onChange(e.target.value)}
				onBlur={() => {
					if (normalized) {
						// Re-emit normalized on blur so the form holds clean data.
						onChange(normalized);
					}
				}}
				disabled={disabled}
				aria-invalid={error ? "true" : undefined}
				aria-describedby={error ? errorId : undefined}
			/>
			{error && (
				<p id={errorId} className="text-destructive text-xs" role="alert">
					{error}
				</p>
			)}
		</div>
	);
}
