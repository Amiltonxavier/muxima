"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "@muxima/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import * as React from "react";

/**
 * Collapsible do design system, construído sobre o `Collapsible` do Base UI
 * (que resolve acessibilidade, teclado, `aria-expanded`/`aria-controls` e o
 * ciclo de vida do painel).
 *
 * - `Collapsible` — raiz; recebe `open`/`defaultOpen`/`onOpenChange`/`disabled`.
 * - `CollapsibleTrigger` — botão que abre/fecha; traz um chevron que roda quando
 *   aberto (`aria-hidden`, controlado por `data-panel-open`).
 * - `CollapsiblePanel` — conteúdo; desmonta quando fechado (usa `keepMounted`
 *   se precisares de o manter no DOM).
 */
function Collapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
	return (
		<CollapsiblePrimitive.Root
			data-slot="collapsible"
			className={className}
			{...props}
		/>
	);
}

const CollapsibleTrigger = React.forwardRef<
	HTMLButtonElement,
	CollapsiblePrimitive.Trigger.Props
>(function CollapsibleTrigger({ className, children, ...props }, ref) {
	return (
		<CollapsiblePrimitive.Trigger
			ref={ref}
			data-slot="collapsible-trigger"
			className={cn(
				"inline-flex items-center gap-2 font-medium text-sm outline-none",
				"data-disabled:cursor-not-allowed data-disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<ChevronRight
				aria-hidden="true"
				className="h-4 w-4 shrink-0 transition-transform data-[panel-open]:rotate-90"
			/>
			{children}
		</CollapsiblePrimitive.Trigger>
	);
});

const CollapsiblePanel = React.forwardRef<
	HTMLDivElement,
	CollapsiblePrimitive.Panel.Props
>(function CollapsiblePanel({ className, ...props }, ref) {
	return (
		<CollapsiblePrimitive.Panel
			ref={ref}
			data-slot="collapsible-panel"
			className={cn("", className)}
			{...props}
		/>
	);
});

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };
