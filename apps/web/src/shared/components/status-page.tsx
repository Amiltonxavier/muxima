import { Button } from "@muxima/ui/components/button";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatusPageProps = {
	/** Ícone de contexto — descreve o estado, não o decora. */
	icon: LucideIcon;
	title: string;
	description: string;
	/** Acção principal, à esquerda do grupo de botões. */
	action?: ReactNode;
	/** Acção secundária, à direita. */
	secondaryAction?: ReactNode;
};

/**
 * Apresentação partilhada dos ecrãs de estado terminal do Muxima (403, 404 e
 * erro inesperado). Existe para que estas páginas partilhem uma única
 * hierarquia visual — sem cantos muito arredondados, sem sombras e sem cor
 * decorativa — em vez de três variantes ligeiramente diferentes.
 */
export function StatusPage({
	icon: Icon,
	title,
	description,
	action,
	secondaryAction,
}: StatusPageProps) {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
			<div className="flex h-12 w-12 items-center justify-center border">
				<Icon className="h-6 w-6 text-muted-foreground" />
			</div>

			<div className="max-w-md space-y-2">
				<h1 className="font-semibold text-xl">{title}</h1>

				<p className="text-muted-foreground text-sm">{description}</p>
			</div>

			{(action || secondaryAction) && (
				<div className="flex flex-wrap items-center justify-center gap-2">
					{action}
					{secondaryAction}
				</div>
			)}
		</div>
	);
}

/**
 * Acção de retorno à área autenticada — o destino seguro partilhado pelos
 * ecrãs de estado. `Link` do router, para não introduzir uma navegação paralela.
 */
export function BackToAppButton({
	label = "Voltar ao início",
}: {
	label?: string;
}) {
	return (
		<Button render={<Link to="/" />} variant="outline" size="sm">
			{label}
		</Button>
	);
}
