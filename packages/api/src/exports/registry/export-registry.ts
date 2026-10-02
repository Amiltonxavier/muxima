import type { ExportContext, ExportFormat, ReportDefinition } from "../core";
import { buildBudgetReport } from "../reports/budget";
import { buildChecklistReport } from "../reports/checklist";
import { buildDedicationReport } from "../reports/dedication";
import { buildEventReport } from "../reports/event";
import { buildFoodPlanReport } from "../reports/food-plan";
import { buildGuestsReport } from "../reports/guests";
import { buildInventoryReport } from "../reports/inventory";
import { buildInvitationReport } from "../reports/invite";
import { buildScheduleReport } from "../reports/schedule";
import { buildSuppliersReport } from "../reports/suppliers";
import { buildTablesReport } from "../reports/tables";
import { buildTasksReport } from "../reports/tasks";

/**
 * Which report backs each exportable module, in which format.
 *
 * A module that has no XLSX variant simply omits the `xlsx` key, and
 * `getReportBuilder` returns `undefined` for it — the route turns that into a
 * 404 rather than silently serving a PDF under an `.xlsx` name.
 */

export type ExportModule =
	| "budget"
	| "checklist"
	| "dedication"
	| "event"
	| "food-plan"
	| "guests"
	| "inventory"
	| "invitation"
	| "schedule"
	| "suppliers"
	| "tables"
	| "tasks";

/** Modules reachable from `/events/:eventId/exports/:module/{pdf,xlsx}`. */
export const EVENT_EXPORT_MODULES = [
	"budget",
	"checklist",
	"event",
	"food-plan",
	"guests",
	"inventory",
	"schedule",
	"suppliers",
	"tables",
	"tasks",
] as const satisfies readonly ExportModule[];

export type EventExportModule = (typeof EVENT_EXPORT_MODULES)[number];

type EventParams = { eventId: string };

/** Params accepted by each module's builder. */
export type ExportModuleParams = {
	budget: EventParams;
	checklist: EventParams;
	dedication: DedicationParams;
	event: EventParams;
	"food-plan": EventParams;
	guests: EventParams;
	inventory: EventParams;
	invitation: InvitationParams;
	schedule: EventParams;
	suppliers: EventParams;
	tables: EventParams;
	tasks: EventParams;
};

type DedicationParams = {
	dedication: Parameters<typeof buildDedicationReport>[0];
};
type InvitationParams = {
	lookup: Parameters<typeof buildInvitationReport>[0]["lookup"];
	schedule: Parameters<typeof buildInvitationReport>[0]["schedule"];
};

type Builder<Params> = {
	reportName: string;
	/** Declared as a method so the heterogeneous registry stays assignable. */
	build(
		params: Params,
		context: ExportContext,
	): Promise<ReportDefinition> | ReportDefinition;
};

/**
 * The registry is keyed by module, and each module knows its own params. Keeping
 * that relationship in the entry type means the registry itself fails to compile
 * if a module's builder is given the wrong params.
 */
type RegistryEntryOf<M extends ExportModule> = {
	[F in ExportFormat]-?: Builder<ExportModuleParams[M]> | undefined;
};

/**
 * Both formats render the very same builder. That is the point: a PDF and its
 * spreadsheet can never be built from two different descriptions of a module.
 */
function bothFormats<Params>(
	reportName: string,
	build: (
		params: Params,
		context: ExportContext,
	) => Promise<ReportDefinition> | ReportDefinition,
): { pdf: Builder<Params>; xlsx: Builder<Params> } {
	return { pdf: { reportName, build }, xlsx: { reportName, build } };
}

const registry = {
	budget: bothFormats<EventParams>("Orçamento", (params, context) =>
		buildBudgetReport(params.eventId, context),
	),
	checklist: bothFormats<EventParams>("Checklist", (params, context) =>
		buildChecklistReport(params.eventId, context),
	),
	event: bothFormats<EventParams>("Evento", (params, context) =>
		buildEventReport(params.eventId, context),
	),
	"food-plan": bothFormats<EventParams>(
		"Plano Alimentação",
		(params, context) => buildFoodPlanReport(params.eventId, context),
	),
	guests: bothFormats<EventParams>("Convidados", (params, context) =>
		buildGuestsReport(params.eventId, context),
	),
	inventory: bothFormats<EventParams>("Inventário", (params, context) =>
		buildInventoryReport(params.eventId, context),
	),
	schedule: bothFormats<EventParams>("Programa", (params, context) =>
		buildScheduleReport(params.eventId, context),
	),
	suppliers: bothFormats<EventParams>("Fornecedores", (params, context) =>
		buildSuppliersReport(params.eventId, context),
	),
	tables: bothFormats<EventParams>("Mesas", (params, context) =>
		buildTablesReport(params.eventId, context),
	),
	tasks: bothFormats<EventParams>("Tarefas", (params, context) =>
		buildTasksReport(params.eventId, context),
	),
	// Individual document: PDF only, and only ever for an already-authorized
	// dedication handed over by DedicationService.
	dedication: {
		pdf: {
			reportName: "Dedicatória",
			build: ({ dedication }, context: ExportContext) =>
				buildDedicationReport(dedication, context),
		},
		xlsx: undefined,
	},
	// Public document: PDF only, built from the public lookup projection.
	invitation: {
		pdf: {
			reportName: "Convite",
			build: ({ lookup, schedule }) =>
				buildInvitationReport({ lookup, schedule }),
		},
		xlsx: undefined,
	},
} satisfies { [K in ExportModule]: RegistryEntryOf<K> };

export function isEventExportModule(value: string): value is EventExportModule {
	return (EVENT_EXPORT_MODULES as readonly string[]).includes(value);
}

export function isExportModule(value: string): value is ExportModule {
	// `Object.hasOwn`, not `in`: `in` also matches inherited keys, which would
	// let `constructor` or `toString` through as if they were modules.
	return Object.hasOwn(registry, value);
}

/**
 * The report name shown in the document header and used to build the file name.
 * The format is appended here so an `.xlsx` never lands in a file named like the
 * PDF it mirrors.
 */
export function getReportName(
	module: ExportModule,
	format: ExportFormat,
): string | undefined {
	const entry = registry[module];
	const name = entry?.[format]?.reportName;
	if (!name) return undefined;
	return format === "xlsx" ? `${name} (XLSX)` : name;
}

/**
 * Resolves the builder for a module/format pair, or `undefined` when that pair
 * has no report — the route turns that into a 404 instead of serving a PDF
 * under an `.xlsx` name.
 *
 * `M` is inferred from a literal at the call site; a widened `string` picks up
 * the union, which is exactly what the routes want after their own validation.
 */
export function getReportBuilder<M extends ExportModule>(
	module: M,
	format: ExportFormat,
): Builder<ExportModuleParams[M]> | undefined {
	const entry = registry[module] as
		| Record<ExportFormat, Builder<never> | undefined>
		| undefined;
	if (!entry) return undefined;
	return (entry[format] ?? undefined) as
		| Builder<ExportModuleParams[M]>
		| undefined;
}
