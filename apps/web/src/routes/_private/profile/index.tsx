import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm } from "./-components/profile-form";
import { useProfile, useUpdateProfile } from "./-queries/user-queries";

export const Route = createFileRoute("/_private/profile/")({
	component: ProfilePage,
});

function ProfilePage() {
	const profileQuery = useProfile();
	const updateProfile = useUpdateProfile();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Perfil</h1>
				<p className="text-muted-foreground text-sm">
					Gerira as suas informações pessoais
				</p>
			</div>

			<ProfileForm profile={profileQuery.data?.data ?? undefined} updateProfile={updateProfile as any} />
		</div>
	);
}
