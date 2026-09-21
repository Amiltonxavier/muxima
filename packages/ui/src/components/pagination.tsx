import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "./button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

interface PaginationProps {
	meta: PaginationMeta;
	onPageChange: (page: number) => void;
	onLimitChange?: (limit: number) => void;
	disabled?: boolean;
	pageSizes?: number[];
}

function Pagination({
	meta,
	onPageChange,
	onLimitChange,
	disabled = false,
	pageSizes = [10, 20, 50],
}: PaginationProps) {
	const { page, limit, total, totalPages } = meta;

	if (totalPages <= 1 && total <= limit) {
		return null;
	}

	const startItem = (page - 1) * limit + 1;
	const endItem = Math.min(page * limit, total);

	const pages: (number | "...")[] = [];
	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) pages.push(i);
	} else {
		pages.push(1);
		if (page > 3) pages.push("...");
		const start = Math.max(2, page - 1);
		const end = Math.min(totalPages - 1, page + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		if (page < totalPages - 2) pages.push("...");
		pages.push(totalPages);
	}

	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<p className="text-muted-foreground text-sm">
				A mostrar{" "}
				<span className="font-medium text-foreground">{startItem}</span> a{" "}
				<span className="font-medium text-foreground">{endItem}</span> de{" "}
				<span className="font-medium text-foreground">{total}</span> registos
			</p>

			<div className="flex items-center gap-4">
				{onLimitChange && (
					<div className="flex items-center gap-2">
						<p className="text-muted-foreground text-sm">Mostrar</p>
						<Select
							value={String(limit)}
							onValueChange={(v) => onLimitChange(Number(v))}
						>
							<SelectTrigger className="h-8 w-[70px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{pageSizes.map((size) => (
									<SelectItem key={size} value={String(size)}>
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-xs"
						disabled={disabled || page === 1}
						onClick={() => onPageChange(1)}
					>
						<ChevronsLeft className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="outline"
						size="icon-xs"
						disabled={disabled || page === 1}
						onClick={() => onPageChange(page - 1)}
					>
						<ChevronLeft className="h-3.5 w-3.5" />
					</Button>

					{pages.map((p, i) =>
						p === "..." ? (
							<span
								key={`ellipsis-${i}`}
								className="px-1 text-muted-foreground text-xs"
							>
								…
							</span>
						) : (
							<Button
								key={p}
								variant={p === page ? "default" : "outline"}
								size="icon-xs"
								disabled={disabled}
								onClick={() => onPageChange(p)}
							>
								{p}
							</Button>
						),
					)}

					<Button
						variant="outline"
						size="icon-xs"
						disabled={disabled || page === totalPages}
						onClick={() => onPageChange(page + 1)}
					>
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="outline"
						size="icon-xs"
						disabled={disabled || page === totalPages}
						onClick={() => onPageChange(totalPages)}
					>
						<ChevronsRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

export { Pagination };
