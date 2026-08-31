import type { ComponentProps, HTMLAttributes } from "react";
import { Badge } from "@muxima/ui/components/badge";
import { cn } from "@muxima/ui/lib/utils";

// ── App status type (all statuses used in Muxima) ───────────────

export type AppStatus =
	// Event
	| "DRAFT"
	| "PLANNING"
	| "CONFIRMED"
	| "COMPLETED"
	| "CANCELLED"
	// Task
	| "TODO"
	| "IN_PROGRESS"
	// Guest
	| "PENDING"
	| "DECLINED"
	| "WAITING"
	// Expense
	| "PLANNED"
	| "PARTIALLY_PAID"
	| "PAID"
	| "OVERDUE"
	// Vendor
	| "PROSPECT"
	| "CONTACTED"
	| "NEGOTIATING"
	| "CONTRACTED"
	// Schedule
	// (uses same as task)
	// Document
	| "ACTIVE"
	| "ARCHIVED"
	| "DELETED"
	// Companion / Invitation
	| "CREATED"
	| "SENT"
	| "OPENED"
	| "RESPONDED"
	| "EXPIRED"
	// Legacy (used by StatusLabel)
	| "online"
	| "offline"
	| "maintenance"
	| "degraded";

// ── Status color mapping ────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
	// Green family
	COMPLETED: "bg-emerald-50 text-emerald-700",
	PAID: "bg-emerald-50 text-emerald-700",
	CONFIRMED: "bg-emerald-50 text-emerald-700",
	CONTRACTED: "bg-emerald-50 text-emerald-700",
	ACTIVE: "bg-emerald-50 text-emerald-700",
	online: "bg-emerald-50 text-emerald-700",
	RESPONDED: "bg-emerald-50 text-emerald-700",

	// Blue family
	PLANNING: "bg-blue-50 text-blue-700",
	IN_PROGRESS: "bg-blue-50 text-blue-700",
	CONTACTED: "bg-blue-50 text-blue-700",
	SENT: "bg-blue-50 text-blue-700",
	OPENED: "bg-blue-50 text-blue-700",
	maintenance: "bg-blue-50 text-blue-700",

	// Amber family
	PENDING: "bg-amber-50 text-amber-700",
	PLANNED: "bg-amber-50 text-amber-700",
	PARTIALLY_PAID: "bg-amber-50 text-amber-700",
	NEGOTIATING: "bg-amber-50 text-amber-700",
	WAITING: "bg-amber-50 text-amber-700",
	CREATED: "bg-amber-50 text-amber-700",
	degraded: "bg-amber-50 text-amber-700",

	// Red family
	CANCELLED: "bg-red-50 text-red-700",
	DECLINED: "bg-red-50 text-red-700",
	OVERDUE: "bg-red-50 text-red-700",
	EXPIRED: "bg-red-50 text-red-700",
	DELETED: "bg-red-50 text-red-700",
	offline: "bg-red-50 text-red-700",

	// Neutral
	DRAFT: "bg-neutral-100 text-neutral-700",
	PROSPECT: "bg-neutral-100 text-neutral-700",
	ARCHIVED: "bg-neutral-100 text-neutral-700",
	TODO: "bg-neutral-100 text-neutral-700",
};

// ── Kibo primitives (original) ──────────────────────────────────

export type StatusProps = ComponentProps<typeof Badge> & {
	status: "online" | "offline" | "maintenance" | "degraded";
};

export const Status = ({ className, status, ...props }: StatusProps) => (
	<Badge
		className={cn("flex items-center gap-2", "group", status, className)}
		variant="secondary"
		{...props}
	/>
);

export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement>;

export const StatusIndicator = ({
	className,
	...props
}: StatusIndicatorProps) => (
	<span className="relative flex h-2 w-2" {...props}>
		<span
			className={cn(
				"absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
				"group-[.online]:bg-emerald-500",
				"group-[.offline]:bg-red-500",
				"group-[.maintenance]:bg-blue-500",
				"group-[.degraded]:bg-amber-500"
			)}
		/>
		<span
			className={cn(
				"relative inline-flex h-2 w-2 rounded-full",
				"group-[.online]:bg-emerald-500",
				"group-[.offline]:bg-red-500",
				"group-[.maintenance]:bg-blue-500",
				"group-[.degraded]:bg-amber-500"
			)}
		/>
	</span>
);

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement>;

export const StatusLabel = ({
	className,
	children,
	...props
}: StatusLabelProps) => (
	<span className={cn("text-muted-foreground", className)} {...props}>
		{children ?? (
			<>
				<span className="hidden group-[.online]:block">Online</span>
				<span className="hidden group-[.offline]:block">Offline</span>
				<span className="hidden group-[.maintenance]:block">Maintenance</span>
				<span className="hidden group-[.degraded]:block">Degraded</span>
			</>
		)}
	</span>
);

// ── App StatusBadge (Muxima-wide) ───────────────────────────────

export type StatusBadgeProps = ComponentProps<typeof Badge> & {
	status: AppStatus;
	label?: string;
};

/**
 * Renders a status badge with the correct color for any Muxima status.
 * Use `label` to override the displayed text (useful for pt-pt labels).
 */
export const StatusBadge = ({
	status,
	label,
	className,
	...props
}: StatusBadgeProps) => (
	<Badge
		className={cn("flex items-center gap-1.5", STATUS_COLORS[status] || STATUS_COLORS.DRAFT, className)}
		variant="secondary"
		{...props}
	>
		{label || status}
	</Badge>
);
