import { cn } from "@muxima/ui/lib/utils";

/**
 * Semantic tones of a status dot. The color is a visual aid only — the label
 * is always rendered next to it, so state never relies on color alone.
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneDotClass: Record<StatusTone, string> = {
	neutral: "bg-neutral-400",
	info: "bg-blue-500",
	success: "bg-emerald-500",
	warning: "bg-amber-500",
	danger: "bg-red-500",
};

export interface StatusDotProps {
	/** Textual label — always rendered; the dot is the visual confirmation. */
	label: string;
	/** Semantic tone of the dot. Default: `neutral`. */
	tone?: StatusTone;
	className?: string;
}

/**
 * State representation used across Muxima: a colored dot plus a textual
 * label. Reusable by every module — the tone mapping lives with the caller
 * (see `getStatusTone` in `utils/status-helpers`), so this component knows
 * nothing about specific domains.
 *
 * Rule: the dot is decoration (`aria-hidden`); the text is the semantic
 * confirmation and is never dropped in favor of color alone.
 */
export function StatusDot({
	label,
	tone = "neutral",
	className,
}: StatusDotProps) {
	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			<span
				aria-hidden="true"
				className={cn("h-2 w-2 shrink-0 rounded-full", toneDotClass[tone])}
			/>
			<span className="text-xs">{label}</span>
		</span>
	);
}
