import { Gift } from "lucide-react";
import type { ReactNode } from "react";

export function InviteShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-svh flex-col items-center bg-gradient-to-b from-background to-muted px-4 py-10">
			<div className="mb-6 flex flex-col items-center gap-2">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
					<Gift className="h-6 w-6 text-primary" />
				</div>
				<p className="text-muted-foreground text-sm">Muxima</p>
			</div>
			<div className="w-full max-w-md space-y-4">{children}</div>
			<p className="mt-8 text-center text-muted-foreground text-xs">
				Convite criado com a Muxima — gestão de noivados e casamentos
			</p>
		</div>
	);
}