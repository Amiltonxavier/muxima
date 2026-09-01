import { Button } from "@muxima/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

type PaginationProps = {
	pagination: PaginationMeta;
	onPageChange: (page: number) => void;
	className?: string;
};

export function Pagination({
	pagination,
	onPageChange,
	className,
}: PaginationProps) {
	const { page, totalPages, hasPreviousPage, hasNextPage } = pagination;

	if (totalPages <= 1) return null;

	const getVisiblePages = (): (number | "...")[] => {
		const pages: (number | "...")[] = [];
		const delta = 2;
		const left = Math.max(2, page - delta);
		const right = Math.min(totalPages - 1, page + delta);

		pages.push(1);
		if (left > 2) pages.push("...");

		for (let i = left; i <= right; i++) {
			pages.push(i);
		}

		if (right < totalPages - 1) pages.push("...");
		if (totalPages > 1) pages.push(totalPages);

		return pages;
	};

	return (
		<div className={`flex items-center gap-1 ${className ?? ""}`}>
			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				disabled={!hasPreviousPage}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>

			{getVisiblePages().map((p, i) =>
				p === "..." ? (
					<span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
						...
					</span>
				) : (
					<Button
						key={p}
						variant={p === page ? "default" : "outline"}
						size="icon"
						className="h-8 w-8"
						onClick={() => onPageChange(p)}
					>
						{p}
					</Button>
				),
			)}

			<Button
				variant="outline"
				size="icon"
				className="h-8 w-8"
				disabled={!hasNextPage}
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>

			<span className="ml-2 text-sm text-muted-foreground">
				Página {page} de {totalPages} ({pagination.total} resultados)
			</span>
		</div>
	);
}
