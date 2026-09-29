import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { QueryState } from "@/shared/components/states";
import { BlockAccountDialog } from "./-components/block-account-dialog";
import { ProfileDangerZone } from "./-components/profile-danger-zone";
import { ProfileDetailsSection } from "./-components/profile-details-section";
import { ProfileInfoSection } from "./-components/profile-info-section";
import {
	useBlockAccount,
	useProfile,
	useUpdateProfile,
} from "./-queries/user-queries";

export const Route = createFileRoute("/_private/profile/")({
	component: ProfilePage,
});

function ProfilePage() {
	const navigate = useNavigate();
	const profileQuery = useProfile();
	const updateProfile = useUpdateProfile();
	const blockAccount = useBlockAccount();

	const [showBlockDialog, setShowBlockDialog] = useState(false);
	const profile = profileQuery.data;

	const handleBlock = (reason?: string) => {
		blockAccount.mutate(
			{ confirm: true as const, reason },
			{
				onSuccess: (result) => {
					setShowBlockDialog(false);
					toast.success(
						`Conta bloqueada. ${result.revokedSessions} sessão(ões) encerrada(s).`,
					);
					// The session no longer exists, so send the user to sign-in.
					navigate({ to: "/login" });
				},
			},
		);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">Perfil</h1>
				<p className="text-muted-foreground text-sm">
					Gere as suas informações pessoais e a segurança da conta
				</p>
			</div>

			<QueryState
				state={{
					isLoading: profileQuery.isLoading,
					isError: profileQuery.isError,
					isEmpty: !profile,
					hasData: !!profile,
				}}
			>
				{profile && (
					<>
						<ProfileInfoSection
							profile={profile}
							isSaving={updateProfile.isPending}
							onSubmit={(values) =>
								updateProfile.mutate(values, {
									onSuccess: () =>
										toast.success("Perfil atualizado com sucesso"),
									onError: (e: Error) => toast.error(e.message),
								})
							}
						/>

						<ProfileDetailsSection profile={profile} />

						<ProfileDangerZone
							profile={profile}
							isBlocking={blockAccount.isPending}
							onBlock={() => setShowBlockDialog(true)}
						/>
					</>
				)}
			</QueryState>

			<BlockAccountDialog
				open={showBlockDialog}
				onClose={() => setShowBlockDialog(false)}
				onConfirm={handleBlock}
				isBlocking={blockAccount.isPending}
			/>
		</div>
	);
}
