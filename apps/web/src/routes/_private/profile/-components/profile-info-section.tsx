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
import { Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useUpdateProfile } from "../-queries/user-queries";
import type { ProfileItem } from "../-types/profile.types";

/**
 * Personal information section.
 *
 * The form resets itself from the query result, so it always reflects the
 * server state and re-hydrates after a refetch.
 */
export function ProfileInfoSection({ profile }: { profile: ProfileItem }) {
	const updateProfile = useUpdateProfile();
	const initialValues = useMemo(
		() => ({
			name: profile.name || "",
			email: profile.email || "",
		}),
		[profile.name, profile.email],
	);

	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			updateProfile.mutate({
				name: value.name.trim(),
				email: value.email.trim(),
			});
		},
	});

	useEffect(() => {
		form.setFieldValue("name", initialValues.name);
		form.setFieldValue("email", initialValues.email);
	}, [initialValues.name, initialValues.email, form.setFieldValue]);

	const isDirty = form.state.isDirty;

	return (
		<Card>
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
								<Label htmlFor="profile-name">Nome</Label>
								<Input
									id="profile-name"
									autoComplete="name"
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
								<Label htmlFor="profile-email">Email</Label>
								<Input
									id="profile-email"
									type="email"
									autoComplete="email"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={updateProfile.isPending}
								/>
								<p className="text-muted-foreground text-xs">
									Também é o email com que inicias sessão.
								</p>
							</div>
						)}
					</form.Field>

					<Button type="submit" disabled={updateProfile.isPending || !isDirty}>
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
