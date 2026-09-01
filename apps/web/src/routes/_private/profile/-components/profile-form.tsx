import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { UseMutateFunction } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Profile } from "../-types";

interface ProfileFormProps {
	profile: Profile | undefined;
	updateProfile: {
		mutate: UseMutateFunction<unknown, Error, Profile>;
		isPending: boolean;
	};
}

export function ProfileForm({ profile, updateProfile }: ProfileFormProps) {
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
			form.setFieldValue("name", profile.name || "");
			form.setFieldValue("email", profile.email || "");
		}
	}, [profile, form.setFieldValue]);

	return (
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
	);
}
