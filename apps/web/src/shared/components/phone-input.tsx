import {
	normalizeAngolaPhone,
	validateAngolaPhone,
} from "@muxima/api/shared/validation/identifiers";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { cn } from "@muxima/ui/lib/utils";
import { useId } from "react";

interface PhoneInputProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	id?: string;
	label?: string;
	/** Helper text shown under the field when there is no error. */
	hint?: string;
	placeholder?: string;
	className?: string;
}

/**
 * Angola phone input used across modules (supplier contacts, MULTICAIXA
 * Express, guests…). Validation lives in the shared `identifiers` module —
 * the same code the API validates with — so feedback and backend rules can
 * never drift.
 *
 * The `onChange` receives the value as typed; the normalized `+2449XXXXXXXX`
 * form is emitted on blur, so the form ends up with clean data without
 * fighting the user while they type.
 */
export function PhoneInput({
	value,
	onChange,
	disabled,
	id,
	label = "Telefone",
	hint,
	placeholder = "+244 9XX XXX XXX",
	className,
}: PhoneInputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const errorId = `${inputId}-error`;

	const error = value ? validateAngolaPhone(value) : null;

	return (
		<div className={cn("space-y-2", className)}>
			<Label htmlFor={inputId}>{label}</Label>
			<Input
				id={inputId}
				type="tel"
				autoComplete="tel-national"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={() => {
					const normalized = normalizeAngolaPhone(value);
					if (value && normalized !== value) {
						onChange(normalized);
					}
				}}
				disabled={disabled}
				aria-invalid={error ? "true" : undefined}
				aria-describedby={
					error ? errorId : hint ? `${inputId}-hint` : undefined
				}
			/>
			{error ? (
				<p id={errorId} className="text-destructive text-xs" role="alert">
					{error}
				</p>
			) : (
				hint && (
					<p id={`${inputId}-hint`} className="text-muted-foreground text-xs">
						{hint}
					</p>
				)
			)}
		</div>
	);
}
