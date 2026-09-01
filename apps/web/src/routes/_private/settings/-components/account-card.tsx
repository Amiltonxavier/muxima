import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";

export function AccountCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Conta</CardTitle>
				<CardDescription>Gerira a sua conta</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-sm">
					Para alterar a sua password ou eliminar a sua conta, contacte o
					suporte.
				</p>
			</CardContent>
		</Card>
	);
}
