import { Input } from "@muxima/ui/components/input";
import { forwardRef, useCallback } from "react";

interface CurrencyInputProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		"value" | "onChange"
	> {
	value: number;
	onChange: (value: number) => void;
	currency?: string;
}

function formatCurrencyValue(value: number): string {
	if (value === 0) return "";
	return value.toLocaleString("pt-AO");
}

function parseCurrencyValue(formatted: string): number {
	const cleaned = formatted.replace(/[^\d]/g, "");
	return cleaned ? Number(cleaned) : 0;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
	({ value, onChange, currency = "AOA", className, ...props }, ref) => {
		const handleChange = useCallback(
			(e: React.ChangeEvent<HTMLInputElement>) => {
				const raw = parseCurrencyValue(e.target.value);
				onChange(raw);
			},
			[onChange],
		);

		return (
			<div className="relative">
				<Input
					ref={ref}
					type="text"
					inputMode="numeric"
					value={formatCurrencyValue(value)}
					onChange={handleChange}
					className={`pr-16 ${className || ""}`}
					{...props}
				/>
				<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm">
					{currency}
				</span>
			</div>
		);
	},
);

CurrencyInput.displayName = "CurrencyInput";
