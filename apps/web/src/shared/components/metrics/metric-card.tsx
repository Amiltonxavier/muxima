import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { cn } from "@muxima/ui/lib/utils";
import type { ReactNode } from "react";
import {
	type MetricTone,
	metricToneTextClass,
	safePercentage,
} from "./segmented-progress";

export type { MetricTone };
export { safePercentage };

/* -------------------------------------------------------------------------- */
/*  MetricCard                                                                */
/* -------------------------------------------------------------------------- */

export interface MetricCardProps {
	/** Título/label da métrica. */
	title: string;
	/** Valor principal (número já formatado ou qualquer ReactNode). */
	value: ReactNode;
	/** Texto de apoio junto ao valor (ex.: "de 120"). */
	description?: ReactNode;
	/** Texto secundário abaixo do valor (ex.: "reserva €200"). */
	secondaryValue?: ReactNode;
	/** Ícone opcional (tipicamente um ícone lucide). */
	icon?: ReactNode;
	/**
	 * Indicador de tendência opcional (ex.: "+5%"). Apenas apresentacional —
	 * o consumidor calcula o valor e o tone.
	 */
	trend?: {
		label: string;
		tone?: MetricTone;
	};
	/** Ação opcional (tipicamente um `Button` ou `Link`). */
	action?: ReactNode;
	className?: string;
}

/**
 * Métrica simples: título, valor, descrição e metadados opcionais.
 *
 * Quando usar: KPIs isolados numa grelha (`StatsGrid`).
 * Quando não usar: métrica com progresso (→ `MetricProgressCard`), com
 * categorias (→ `MetricBreakdownCard`) ou percentagem de destaque
 * (→ `MetricRadialCard`).
 */
export function MetricCard({
	title,
	value,
	description,
	secondaryValue,
	icon,
	trend,
	action,
	className,
}: MetricCardProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
				<CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-xs">
					{title}
					{trend && (
						<span
							className={cn(
								"font-medium",
								metricToneTextClass[trend.tone ?? "default"],
							)}
						>
							{trend.label}
						</span>
					)}
				</CardTitle>
				{icon && (
					<div aria-hidden="true" className="text-muted-foreground">
						{icon}
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="font-semibold text-2xl">{value}</div>
				{description && (
					<p className="mt-1 text-muted-foreground text-xs">{description}</p>
				)}
				{secondaryValue && (
					<p className="text-muted-foreground text-xs">{secondaryValue}</p>
				)}
				{action && <div className="mt-2">{action}</div>}
			</CardContent>
		</Card>
	);
}
