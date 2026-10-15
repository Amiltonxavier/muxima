import { cn } from "@muxima/ui/lib/utils";
import type * as React from "react";
import "./spinner.css";

export function Spinner({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			aria-label="A carregar"
			className={cn("mui-spinner", className)}
			role="status"
			{...props}
		/>
	);
}
