import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { cn } from "@muxima/ui/lib/utils";
import type { ReactNode } from "react";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { RingChart } from "@/components/charts/ring-chart";

/* -------------------------------------------------------------------------- */
/*  RadialProgress / MetricRadialCard                                         */
/* -------------------------------------------------------------------------- */

export interface RadialProgressProps {
	/** Percentagem 0–100 (clamped internamente; NaN → 0). */
	value: number;
	/** Label sob o valor central (ex.: "concluído"). */
	label?: string;
	/** Descrição abaixo do gráfico (opcional). */
	description?: ReactNode;
	/** Tamanho do gráfico em px. Default: 160. */
	size?: number;
	/** Espessura do anel em px. Default: 14. */
	strokeWidth?: number;
	/** Prefixo do valor central (ex.: "€"). */
	prefix?: string;
	/** Sufixo do valor central (ex.: "%"). */
	suffix?: string;
	className?: string;
}

/**
 * Progresso circular isolado — encapsula o `RingChart` existente (visx), que
 * fica animado/interactivo exactamente como nos charts do Muxima.
 *
 * As páginas não precisam de conhecer `Ring`/`RingCenter`/arcos: recebem
 * `value`, `label` e pronto.
 *
 * Quando usar: uma percentagem de destaque.
 * Quando não usar: distribuições multi-série (→ charts do módulo) ou valores
 * absolutos sem ratio (→ `MetricCard`).
 */
export function RadialProgress({
	value,
	label,
	description,
	size = 160,
	strokeWidth = 14,
	prefix,
	suffix,
	className,
}: RadialProgressProps) {
	const pct = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);

	return (
		<div className={cn("flex flex-col items-center gap-2", className)}>
			<RingChart
				data={[{ label: label ?? "", value: pct, maxValue: 100 }]}
				size={size}
				strokeWidth={strokeWidth}
			>
				<Ring index={0} />
				<RingCenter defaultLabel={label} prefix={prefix} suffix={suffix} />
			</RingChart>
			{description && (
				<p className="text-center text-muted-foreground text-xs">
					{description}
				</p>
			)}
		</div>
	);
}

export interface MetricRadialCardProps {
	title: string;
	/** Percentagem 0–100. */
	value: number;
	/** Label sob o valor central (ex.: "concluído"). */
	label?: string;
	description?: ReactNode;
	size?: number;
	strokeWidth?: number;
	prefix?: string;
	suffix?: string;
	/** Ação opcional (tipicamente um `Button`/`Link`). */
	action?: ReactNode;
	className?: string;
}

/**
 * Progresso radial dentro de um card.
 *
 * Quando usar: percentagem de destaque com título ("Conclusão: 72%").
 * Quando não usar: múltiplos anéis/comparações (→ charts do módulo).
 */
export function MetricRadialCard({
	title,
	value,
	label,
	description,
	size,
	strokeWidth,
	prefix,
	suffix,
	action,
	className,
}: MetricRadialCardProps) {
	return (
		<Card className={className}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-2">
				<RadialProgress
					value={value}
					label={label}
					size={size}
					strokeWidth={strokeWidth}
					prefix={prefix}
					suffix={suffix}
				/>
				{description && (
					<p className="text-center text-muted-foreground text-xs">
						{description}
					</p>
				)}
				{action && <div className="mt-1">{action}</div>}
			</CardContent>
		</Card>
	);
}
