import type { FastifyReply } from "fastify";

import type { ExportContext, ExportFormat } from "../core";
import {
	createExportFileName,
	renderReportToPdf,
	renderReportToXlsx,
} from "../core";

import {
	type ExportModule,
	type ExportModuleParams,
	getReportBuilder,
} from "../registry/export-registry";

export type { ExportModule, ExportModuleParams };

export type GeneratedExport = {
	buffer: Buffer;
	fileName: string;
	contentType: string;
};

const CONTENT_TYPES: Record<ExportFormat, string> = {
	pdf: "application/pdf",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Builds the definition, renders it, and names it — in that order.
 *
 * Naming lives in `createExportFileName`, so no caller ever assembles a file
 * name by hand, and the format-specific rendering stays confined to the two
 * layout modules.
 */
export async function generateExport<M extends ExportModule>(
	module: M,
	format: ExportFormat,
	params: ExportModuleParams[M],
	context: ExportContext,
): Promise<GeneratedExport> {
	const entry = getReportBuilder(module, format);
	if (!entry) {
		throw new ExportNotSupportedError(module, format);
	}

	const report = await entry.build(params, context);

	const buffer =
		format === "pdf"
			? renderReportToPdf(report, context)
			: await renderReportToXlsx(report, context);

	return {
		buffer,
		fileName: createExportFileName({
			eventName: context.event?.name,
			reportName: entry.reportName,
			format,
			date: context.generatedAt,
		}),
		contentType: CONTENT_TYPES[format],
	};
}

/** Thrown when a module/format pair has no report — the route maps it to 404. */
export class ExportNotSupportedError extends Error {
	constructor(
		readonly module: string,
		readonly format: string,
	) {
		super(`Export "${module}" is not available in ${format}`);
		this.name = "ExportNotSupportedError";
	}
}

/**
 * `attachment` for downloads, `inline` for the browser-opened preview.
 *
 * The name is ASCII by construction (see `createExportFileName`), and the
 * UTF-8 form is added alongside it so non-ASCII event names still render
 * correctly in clients that prefer it.
 */
export function contentDisposition(fileName: string, inline = false): string {
	// Quotes, backslashes and control characters are removed from the fallback
	// even though `createExportFileName` cannot emit them: this header builder is
	// exported, and a stray `"` or CRLF here would end the header early.
	const ascii = fileName.replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "");
	const disposition = inline ? "inline" : "attachment";
	const encoded = encodeURIComponent(fileName);
	return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Writes a generated export to the reply as a download or an inline preview. */
export async function sendExport<M extends ExportModule>(
	reply: FastifyReply,
	module: M,
	format: ExportFormat,
	params: ExportModuleParams[M],
	context: ExportContext,
	options: { inline?: boolean } = {},
): Promise<void> {
	const { buffer, fileName, contentType } = await generateExport(
		module,
		format,
		params,
		context,
	);

	return reply
		.header("Content-Type", contentType)
		.header("Content-Disposition", contentDisposition(fileName, options.inline))
		.header("Content-Length", buffer.length)
		.header("Cache-Control", "no-store")
		.send(buffer);
}
