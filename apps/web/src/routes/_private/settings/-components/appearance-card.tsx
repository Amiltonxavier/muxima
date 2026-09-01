import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { ModeToggle } from "@/shared/components/mode-toggle";

export function AppearanceCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Aparência</CardTitle>
				<CardDescription>Escolha o tema da aplicação</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4">
					<span className="text-sm">Tema:</span>
					<ModeToggle />
				</div>
			</CardContent>
		</Card>
	);
}
