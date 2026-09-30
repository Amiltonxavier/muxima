import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { QueryState } from "@/shared/components/states";
import { ActivityHistoryTable } from "./-components/activity-history-table";
import { BlockAccountDialog } from "./-components/block-account-dialog";
import { ChangePasswordForm } from "./-components/change-password-form";
import { ProfileDangerZone } from "./-components/profile-danger-zone";
import { ProfileDetailsSection } from "./-components/profile-details-section";
import { ProfileInfoSection } from "./-components/profile-info-section";
import { ProfileRolesSection } from "./-components/profile-roles-section";
import {
	useBlockAccount,
	useProfile,
	useUpdateProfile,
} from "./-queries/user-queries";

export const Route = createFileRoute("/_private/profile/")({
	component: ProfilePage,
});

/** The three areas of the page, kept as the single source for the tab list. */
const TABS = [
	{ value: "profile", label: "Perfil" },
	{ value: "security", label: "Segurança" },
	{ value: "history", label: "Histórico" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function ProfilePage() {
	const navigate = useNavigate();
	const profileQuery = useProfile();
	const updateProfile = useUpdateProfile();
	const blockAccount = useBlockAccount();

	const [tab, setTab] = useState<TabValue>("profile");
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
					Gere as suas informações, a segurança da conta e consulte o seu
					histórico
				</p>
			</div>

			<Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
				<TabsList>
					{TABS.map((item) => (
						<TabsTrigger key={item.value} value={item.value}>
							{item.label}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="profile">
					<QueryState
						state={{
							isLoading: profileQuery.isLoading,
							isError: profileQuery.isError,
							isEmpty: !profile,
							hasData: !!profile,
						}}
						emptyMessage="Não foi possível carregar o teu perfil."
						errorMessage="Não foi possível carregar o teu perfil. Tenta novamente."
						onRetry={() => void profileQuery.refetch()}
					>
						{profile && (
							<div className="space-y-6">
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

								<ProfileRolesSection profile={profile} />
							</div>
						)}
					</QueryState>
				</TabsContent>

				<TabsContent value="security">
					<div className="space-y-6">
						<ChangePasswordForm />

						{profile && (
							<ProfileDangerZone
								profile={profile}
								isBlocking={blockAccount.isPending}
								onBlock={() => setShowBlockDialog(true)}
							/>
						)}
					</div>
				</TabsContent>

				<TabsContent value="history">
					<ActivityHistoryTable />
				</TabsContent>
			</Tabs>

			<BlockAccountDialog
				open={showBlockDialog}
				onClose={() => setShowBlockDialog(false)}
				onConfirm={handleBlock}
				isBlocking={blockAccount.isPending}
			/>
		</div>
	);
}
