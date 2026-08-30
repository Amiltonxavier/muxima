import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "./-queries/user-queries";

export const Route = createFileRoute("/_private/profile/")({
	component: ProfilePage,
});

function ProfilePage() {
	const profileQuery = useProfile();
	const updateProfile = useUpdateProfile();
	const profile = profileQuery.data;

	const form = useForm({
		defaultValues: {
			name: "",
			email: "",
		},
		onSubmit: async ({ value }) => {
			updateProfile.mutate(value, {
				onSuccess: () => toast.success("Perfil atualizado com sucesso"),
				onError: (e) => toast.error(e.message),
			});
		},
	});

	useEffect(() => {
		if (profile) {
			form.setFieldValue("name", (profile as any).name || "");
			form.setFieldValue("email", (profile as any).email || "");
		}
	}, [profile, form.setFieldValue]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Perfil</h1>
				<p className="text-muted-foreground text-sm">
					Gerira as suas informações pessoais
				</p>
			</div>

			<Card className="max-w-lg">
				<CardHeader>
					<CardTitle>Informações pessoais</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label>Nome</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={updateProfile.isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label>Email</Label>
									<Input
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={updateProfile.isPending}
									/>
								</div>
							)}
						</form.Field>
						<Button type="submit" disabled={updateProfile.isPending}>
							{updateProfile.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Guardar alterações
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
