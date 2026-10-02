// Per-module analytics live next to the modules they describe; re-exported here
// so the export layer has a single import surface.
export {
	type BudgetAnalytics,
	budgetAnalytics,
} from "../modules/budget/analytics";
export {
	type ChecklistAnalytics,
	checklistAnalytics,
} from "../modules/checklist/analytics";
export {
	computeCountdown,
	type EventCountdown,
	type EventSummaryAnalytics,
	getEventSummaryAnalytics,
} from "../modules/dashboard/event-analytics";
export { dedicationAnalytics } from "../modules/dedication/analytics";
export {
	type FoodPlanStats,
	foodPlanAnalytics,
} from "../modules/food-plan/analytics";
export {
	type GuestAnalytics,
	getGuestAnalytics,
	getTableAnalytics,
	guestAnalytics,
	type TableAnalytics,
} from "../modules/guests/analytics";
export {
	type InventoryStats,
	inventoryAnalytics,
} from "../modules/inventory/analytics";
export {
	type InvitationStats,
	invitationAnalytics,
} from "../modules/invitations/analytics";
export {
	type SupplierAnalytics,
	supplierAnalytics,
} from "../modules/suppliers/analytics";
export {
	getScheduleAnalytics,
	getTaskAnalytics,
	type ScheduleAnalytics,
	type TaskAnalytics,
	taskAnalytics,
} from "../modules/tasks/analytics";
export {
	createExportFileName,
	type ExportActor,
	type ExportContext,
	type ExportEventInfo,
	type ExportFileNameInput,
	type ExportFormat,
	type ExportMetaEntry,
	formatDate,
	formatDateTime,
	formatMoney,
	formatNumber,
	formatPercent,
	formatText,
	MUXIMA_BRAND,
	type MuximaPdfLayoutOptions,
	type MuximaXlsxLayoutOptions,
	type ReportColumn,
	type ReportColumnAlign,
	type ReportColumnType,
	type ReportDefinition,
	type ReportKpi,
	type ReportPair,
	type ReportRow,
	type ReportSection,
	type ReportTotals,
	renderReportToPdf,
	renderReportToXlsx,
	sanitizeText,
	toAsciiFileName,
} from "./core";
export * as labels from "./core/report-labels";
export {
	ANONYMOUS_ACTOR,
	buildExportContext,
	loadEventInfo,
	toEventInfo,
	toPublicEventInfo,
} from "./orchestration/export-context";
export {
	contentDisposition,
	ExportNotSupportedError,
	type GeneratedExport,
	generateExport,
	sendExport,
} from "./orchestration/export-service";
export * from "./registry/export-registry";
