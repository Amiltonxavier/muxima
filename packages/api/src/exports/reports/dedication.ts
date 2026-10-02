import {
	parseRichTextContent,
	richTextToPlainText,
} from "../../modules/dedication/rich-text";
import type {
	DedicationDetail,
	RichTextNode,
} from "../../shared/types/entities";
import type { ExportContext } from "../core/export-context";
import { formatDateTime } from "../core/format";
import type { ReportDefinition } from "../core/report-definition";
import {
	labelDedicationStatus,
	labelDedicationType,
} from "../core/report-labels";

/**
 * Individual dedication report.
 *
 * There is no global dedication export on purpose. The service that resolves
 * the dedication for this caller (`DedicationService.get`) already enforces
 * owner-or-viewer, so this builder only formats what that service returned. The
 * only input it accepts is one already-authorized dedication.
 */

/** One entry per top-level block, so paragraphs stay separate in the report. */
export function richTextToLines(content: RichTextNode): string[] {
	const parsed = parseRichTextContent(content);
	if (!parsed) return [];

	const lines: string[] = [];
	for (const node of parsed.content ?? []) {
		if (node.type === "horizontalRule") {
			lines.push("———");
			continue;
		}
		const text = richTextToPlainText(node)
			.replace(/[ \t]+/g, " ")
			.trim();
		if (text) lines.push(text);
	}

	return lines;
}

export function buildDedicationReport(
	dedication: DedicationDetail,
	_context: ExportContext,
): ReportDefinition {
	const lines = richTextToLines(dedication.content);

	return {
		title: dedication.title,
		subtitle: labelDedicationType(dedication.type),
		sections: [
			{
				kind: "pairs",
				title: "Detalhes",
				items: [
					{ label: "Título", value: dedication.title },
					{ label: "Tipo", value: labelDedicationType(dedication.type) },
					{ label: "Estado", value: labelDedicationStatus(dedication.status) },
					{
						label: "Visibilidade",
						value: dedication.isLocked
							? "Privada (apenas o autor)"
							: "Partilhada com membros indicados",
					},
					{ label: "Autor", value: dedication.owner.name },
					{
						label: "Última abertura",
						value: dedication.lastOpenedAt
							? formatDateTime(dedication.lastOpenedAt)
							: "—",
					},
					{ label: "Criado em", value: formatDateTime(dedication.createdAt) },
					{
						label: "Atualizado em",
						value: formatDateTime(dedication.updatedAt),
					},
				],
			},
			{
				kind: "paragraphs",
				title: "Texto",
				paragraphs: lines.length > 0 ? lines : ["(sem texto escrito)"],
			},
		],
	};
}
