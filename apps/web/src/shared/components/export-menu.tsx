import { PERMISSIONS, type Permission } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@muxima/ui/components/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEventCan } from "@/shared/hooks/use-can";
import {
	type ExportFormat,
	type ExportModule,
	toastExportError,
	useExportEventModule,
} from "@/shared/hooks/use-export-download";

/**
 * Mirrors `EXPORT_PERMISSIONS` in `modules/exports/routes.ts`.
 *
 * Kept in step with the server map rather than reusing it: the API package
 * cannot be imported here without dragging the whole server router (and Prisma)
 * into the browser bundle. The test below fails if the two ever diverge, which
 * is cheaper than the duplication being wrong in production.
 */
const MODULE_PERMISSION: Record<ExportModule, Permission> = {
	budget: PERMISSIONS.BUDGET_EXPORT,
	checklist: PERMISSIONS.CHECKLIST_READ,
	event: PERMISSIONS.EVENT_READ,
	"food-plan": PERMISSIONS.FOOD_PLAN_READ,
	guests: PERMISSIONS.GUEST_EXPORT,
	inventory: PERMISSIONS.INVENTORY_EXPORT,
	schedule: PERMISSIONS.SCHEDULE_READ,
	tables: PERMISSIONS.TABLE_READ,
	suppliers: PERMISSIONS.SUPPLIER_EXPORT,
	tasks: PERMISSIONS.TASK_READ,
};

interface ExportMenuProps {
	eventId: string;
	/** The module this screen shows; `event` is the full aggregate report. */
	module: ExportModule;
	/** Pages without spreadsheets (dedication, invitation) pass `false`. */
	allowSpreadsheet?: boolean;
	className?: string;
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "default" | "sm" | "lg" | "icon";
}

/**
 * The download control for one event module.
 *
 * The menu only chooses a format and asks the API for the file. Nothing about
 * the document is computed here: the server returns the finished PDF/XLSX with
 * its own filename, and the browser saves that blob as-is.
 *
 * While a download is in flight the trigger is disabled, which is what stops a
 * second click from starting a duplicate export — the request is idempotent in
 * content but wasteful in time, and users double-click impatiently.
 */
export function ExportMenu({
	eventId,
	module,
	allowSpreadsheet = true,
	className,
	variant = "outline",
	size = "sm",
}: ExportMenuProps) {
	// The server answers a forbidden export with 404, so the menu is the only
	// place the user learns the report is not theirs to generate.
	const canExport = useEventCan(
		eventId,
		PERMISSIONS.EXPORT_CREATE,
		MODULE_PERMISSION[module],
	);

	const { mutate, isPending } = useExportEventModule({
		onSuccess: () =>
			toast.success(
				module === "event" ? "Relatório completo gerado." : "Relatório gerado.",
			),
	});

	const run = (format: ExportFormat) => mutate({ eventId, module, format });

	if (!canExport) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button
					className={className}
					variant={variant}
					size={size}
					disabled={isPending}
				>
					{isPending ? (
						<>
							<Loader2 className="animate-spin" />A gerar...
						</>
					) : (
						<>
							<Download />
							Exportar
						</>
					)}
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-64 p-1.5">
				<div className="px-2.5 py-2">
					<p className="font-medium text-sm">Exportar dados</p>
					<p className="text-muted-foreground text-xs">
						Escolha o formato do ficheiro
					</p>
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={() => run("pdf")}
					className="gap-3 px-2.5 py-2.5"
				>
					<div className="flex size-8 shrink-0 items-center justify-center border">
						<FileText className="size-4" />
					</div>

					<div className="min-w-0">
						<p className="font-medium text-sm">PDF</p>
						<p className="text-muted-foreground text-xs">
							Documento pronto para impressão
						</p>
					</div>
				</DropdownMenuItem>

				{allowSpreadsheet && (
					<DropdownMenuItem
						onClick={() => run("xlsx")}
						className="gap-3 px-2.5 py-2.5"
					>
						<div className="flex size-8 shrink-0 items-center justify-center border">
							<FileSpreadsheet className="size-4" />
						</div>

						<div className="min-w-0">
							<p className="font-medium text-sm">Excel</p>
							<p className="text-muted-foreground text-xs">
								Dados editáveis em formato XLSX
							</p>
						</div>
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * A single-format button, for the pages that only produce a PDF. It shares the
 * pending lock of the menu so the two controls cannot run at the same time.
 */
export function ExportPdfButton({
	eventId,
	module,
	label = "Descarregar PDF",
	className,
	variant = "outline",
	size = "sm",
	onError = toastExportError,
}: {
	eventId: string;
	module: ExportModule;
	label?: string;
	className?: string;
	variant?: ExportMenuProps["variant"];
	size?: ExportMenuProps["size"];
	onError?: (error: unknown) => void;
}) {
	const { mutate, isPending } = useExportEventModule();

	return (
		<Button
			className={className}
			variant={variant}
			size={size}
			disabled={isPending}
			onClick={() =>
				mutate(
					{ eventId, module, format: "pdf" },
					{ onError: onError, onSuccess: () => toast.success("PDF gerado.") },
				)
			}
		>
			{isPending ? <Loader2 className="animate-spin" /> : <FileText />}
			{isPending ? "A gerar" : label}
		</Button>
	);
}
