import type {
	ActivityChange,
	ActivityLog,
} from "@muxima/api/shared/types/entities";
import { Badge } from "@muxima/ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { formatDateTime } from "@/utils/format-date";
import {
	activityActionLabel,
	activityResourceLabel,
} from "../-constants/activity-labels";

/**
 * Renders one activity log in full.
 *
 * The interesting part is `changes`: the backend stores a field-level diff, and
 * it is shown as an explicit "Field / Before / After" list. Only leftover
 * metadata — the context the logger could not express as a before/after pair —
 * falls back to a key/value list, never a raw `JSON.stringify` dump.
 */
export function ActivityDetailsDialog({
	log,
	onClose,
}: {
	log: ActivityLog | null;
	onClose: () => void;
}) {
	return (
		<Dialog open={log !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl">
				{log && (
					<>
						<DialogHeader>
							<DialogTitle>{activityActionLabel(log.action)}</DialogTitle>
							<DialogDescription>
								{formatDateTime(String(log.createdAt))}
							</DialogDescription>
						</DialogHeader>

						<ActivityDetailsBody log={log} />
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ActivityDetailsBody({ log }: { log: ActivityLog }) {
	const { changes, context } = splitMetadata(log.metadata);
	const actionLabel = activityActionLabel(log.action);
	// The action is already the dialog's title and the description is often just
	// a restatement of it (an `EVENT_UPDATED` log is usually described as
	// "Evento atualizado"). Neither is repeated in the body, because showing the
	// same sentence twice reads as a rendering bug.
	const descriptionAddsDetail = log.description !== actionLabel;

	return (
		<div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
			<dl className="grid gap-3 sm:grid-cols-2">
				<Field label="Data" value={formatDateTime(String(log.createdAt))} />
				<Field label="Utilizador" value={log.userId} mono />
				<Field label="Recurso" value={activityResourceLabel(log.resource)} />
				{log.resourceId && (
					<Field label="ID do recurso" value={log.resourceId} mono />
				)}
				{log.eventId && <Field label="Evento" value={log.eventId} mono />}
				{log.ipAddress && <Field label="IP" value={log.ipAddress} mono />}
				{log.userAgent && (
					<Field
						label="Dispositivo"
						value={log.userAgent}
						className="break-all"
					/>
				)}
			</dl>

			{descriptionAddsDetail && (
				<div className="space-y-2">
					<p className="font-medium text-sm">Descrição</p>
					<p className="text-muted-foreground text-sm">{log.description}</p>
				</div>
			)}

			{changes.length > 0 && (
				<div className="space-y-2">
					<p className="font-medium text-sm">Alterações</p>
					<ul className="divide-y rounded-md border">
						{changes.map((change) => (
							<ChangeRow key={change.field} change={change} />
						))}
					</ul>
				</div>
			)}

			{context.length > 0 && (
				<div className="space-y-2">
					<p className="font-medium text-sm">Contexto</p>
					<dl className="divide-y rounded-md border">
						{context.map(([key, value]) => (
							<div key={key} className="flex gap-3 px-3 py-2 text-sm">
								<dt className="text-muted-foreground">{key}</dt>
								<dd className="ml-auto break-all text-right font-medium">
									{formatContextValue(value)}
								</dd>
							</div>
						))}
					</dl>
				</div>
			)}
		</div>
	);
}

function ChangeRow({ change }: { change: ActivityChange }) {
	return (
		<li className="space-y-1 px-3 py-2 text-sm">
			<p className="font-medium">{change.field}</p>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="secondary">Antes</Badge>
				<span className="break-all text-muted-foreground">
					{formatContextValue(change.before)}
				</span>
				<span aria-hidden className="text-muted-foreground">
					→
				</span>
				<Badge variant="outline">Depois</Badge>
				<span className="break-all">{formatContextValue(change.after)}</span>
			</div>
		</li>
	);
}

function Field({
	label,
	value,
	mono,
	className,
}: {
	label: string;
	value: string;
	mono?: boolean;
	className?: string;
}) {
	return (
		<div className="space-y-1">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className={`text-sm ${mono ? "font-mono" : ""} ${className ?? ""}`}>
				{value}
			</dd>
		</div>
	);
}

type ParsedMetadata = {
	changes: ActivityChange[];
	context: [string, unknown][];
};

/**
 * Splits the stored metadata into the field-level diff and the leftover context.
 *
 * The payload is whatever the logging module put there, so it is treated as
 * untrusted: a non-object, or a malformed `changes` entry, is ignored rather
 * than assumed to be well-formed.
 */
export function splitMetadata(metadata: unknown): ParsedMetadata {
	if (
		typeof metadata !== "object" ||
		metadata === null ||
		Array.isArray(metadata)
	) {
		return { changes: [], context: [] };
	}

	const record = metadata as Record<string, unknown>;
	const changes = Array.isArray(record.changes)
		? record.changes.filter(isActivityChange)
		: [];

	const context: [string, unknown][] = [];
	for (const [key, value] of Object.entries(record)) {
		if (key === "changes") continue;
		if (value === null || value === undefined) continue;
		context.push([key, value]);
	}

	return { changes, context };
}

function isActivityChange(value: unknown): value is ActivityChange {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.field === "string" && "before" in record && "after" in record
	);
}

/** Renders a metadata value as text, with objects flattened rather than dumped. */
export function formatContextValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value instanceof Date) return formatDateTime(value);
	if (Array.isArray(value)) {
		return value.map(formatContextValue).join(", ");
	}
	if (typeof value === "object") {
		return Object.entries(value as Record<string, unknown>)
			.map(([key, entry]) => `${key}: ${formatContextValue(entry)}`)
			.join(", ");
	}
	return String(value);
}
