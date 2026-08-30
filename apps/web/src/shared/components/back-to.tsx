import { Button } from "@muxima/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface BackButtonProps {
	to: string;
	label?: ReactNode;
	className?: string;
}

export function BackButton({
	to,
	label = "Voltar",
	className,
}: BackButtonProps) {
	return (
		<Button
			variant="ghost"
			size="sm"
			className={className}
			render={<Link to={to} />}
		>
			<ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
			{label}
		</Button>
	);
}
