import { cn } from "@muxima/ui/lib/utils";
import type { ReactNode } from "react";

export interface StatsGridProps {
	/**
	 * Número de colunas em desktop (`lg`). Em mobile é sempre 1 coluna; em `sm`
	 * usa 2 (excepto `columns={2}`, que mantém 2). Default: 3.
	 */
	columns?: 2 | 3 | 4;
	className?: string;
	children: ReactNode;
}

const columnsClass: Record<NonNullable<StatsGridProps["columns"]>, string> = {
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-2 lg:grid-cols-3",
	4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Grelha responsiva para compor métricas. Apenas layout — não conhece dados
 * nem o conteúdo dos filhos.
 *
 * Quando usar: sempre que várias métricas/cards aparecem lado a lado, para
 * garantir espaçamento e breakpoints consistentes.
 */
export function StatsGrid({
	columns = 3,
	className,
	children,
}: StatsGridProps) {
	return (
		<div
			className={cn("grid grid-cols-1 gap-4", columnsClass[columns], className)}
		>
			{children}
		</div>
	);
}
