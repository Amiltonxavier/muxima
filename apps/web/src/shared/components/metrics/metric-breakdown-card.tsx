import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import type { ReactNode } from "react";
import { type MetricTone, SegmentedProgress } from "./segmented-progress";

export interface MetricBreakdownItem {
	label: string;
	value: number;
	/**
	 * Percentagem pré-calculada. Nota: a percentagem mostrada na legenda da
	 * barra é sempre recalculada sobre o total; este campo é reservado para
	 * consumidores que queiram reutilizar o valor noutro contexto.
	 */
	percentage?: number;
	tone?: MetricTone;
	/** Cor explícita (CSS color), ex.: para alinhar com paletas de charts. */
	color?: string;
}

export interface MetricBreakdownCardProps {
	title: string;
	/** Valor total (ReactNode para permitir formatação, ex.: moeda). */
	value: ReactNode;
	/** Total de referência; por omissão, a soma dos items. */
	total?: number;
	items: MetricBreakdownItem[];
	description?: ReactNode;
	icon?: ReactNode;
	action?: ReactNode;
	/** Mostrar a barra segmentada. Default: `true`. */
	showBar?: boolean;
	/** Mostrar a legenda da barra. Default: `true`. */
	showLegend?: boolean;
	/** Formata os valores da legenda (ex.: moeda). */
	formatValue?: (value: number) => string;
	className?: string;
}

/**
 * Métrica composta por várias categorias: valor total, barra segmentada e
 * legenda.
 *
 * Quando usar: distribuições parte-de-um-todo ("X por estado").
 * Quando não usar: progresso simples (→ `MetricProgressCard`) ou listas por
 * entidade com status (→ `MetricStatusList`).
 */
export function MetricBreakdownCard({
	title,
	value,
	total,
	items,
	description,
	icon,
	action,
	showBar = true,
	showLegend = true,
	formatValue,
	className,
}: MetricBreakdownCardProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
				<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
					{title}
					{icon && <span aria-hidden="true">{icon}</span>}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="font-semibold text-2xl">{value}</div>
				{showBar && (
					<SegmentedProgress
						segments={items.map((item) => ({
							label: item.label,
							value: item.value,
							tone: item.tone,
							color: item.color,
						}))}
						total={total}
						showLegend={showLegend}
						formatValue={formatValue}
						aria-label={title}
					/>
				)}
				{description && (
					<p className="text-muted-foreground text-xs">{description}</p>
				)}
				{action && <div>{action}</div>}
			</CardContent>
		</Card>
	);
}
