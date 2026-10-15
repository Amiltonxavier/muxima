import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	CalendarDays,
	Check,
	Loader2,
	UserRound,
	UserRoundCheck,
	UserRoundX,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { LoadingState } from "@/shared/components/states/loading-state";
import { parseApiError } from "@/shared/errors";
import { accessKeys } from "@/shared/hooks/use-can";
import { formatDate } from "@/utils/format-date";
import {
	useAcceptMemberInvite,
	useDeclineMemberInvite,
	useMemberInvite,
} from "./-queries/member-invite-queries";

/**
 * Landing page of the team-invitation e-mail.
 *
 * The link carries an opaque, single-use token; the page shows what is on
 * offer (event, role, who invited), lets the visitor accept or decline, and —
 * on acceptance — drops them straight into the event. Everything is validated
 * server-side: an expired, already-used or foreign token fails here with the
 * API's own PT-PT message, and a visitor without a session is sent to login
 * with a `returnTo` back to this exact page.
 */
export const Route = createFileRoute("/invite/member/$token/")({
	validateSearch: z.object({
		// `?respond=decline` marks the link of the "Recusar" e-mail button.
		respond: z.enum(["decline"]).optional(),
	}),
	beforeLoad: async ({ location }) => {
		const { data: session, error } = await authClient.getSession();
		// Only a genuinely absent session redirects: a server error must not
		// bounce a signed-in user to the login page.
		if (!session && !error) {
			throw redirect({
				to: "/login",
				search: {
					returnTo: location.pathname + location.search + location.hash,
				},
			});
		}
	},
	pendingComponent: LoadingState,
	component: MemberInvitePage,
});

type Answer = "accepted" | "declined";

function MemberInvitePage() {
	const { token } = Route.useParams();
	const { respond } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const inviteQuery = useMemberInvite(token);
	const acceptInvite = useAcceptMemberInvite();
	const declineInvite = useDeclineMemberInvite();
	const [answer, setAnswer] = useState<Answer | null>(null);

	const invite = inviteQuery.data;
	const declineMode = respond === "decline";
	const pending = acceptInvite.isPending || declineInvite.isPending;

	// Keep the browser tab meaningful while the visitor decides.
	useEffect(() => {
		document.title = invite
			? `Convite · ${invite.eventName} · Muxima`
			: "Convite de membro · Muxima";
	}, [invite]);

	function handleAccept() {
		if (!invite) return;
		acceptInvite.mutate(
			{ token },
			{
				onSuccess: async () => {
					setAnswer("accepted");
					// The event layout's `beforeLoad` reads `accessKeys.byEvent`
					// with a 30s staleTime; invalidate the pre-acceptance
					// `{ role: null }` before navigating so it cannot bounce the
					// new member to /403.
					await queryClient.invalidateQueries({
						queryKey: accessKeys.all,
					});
					// The whole point of the e-mail: land on the event itself.
					await navigate({
						to: "/events/$eventId",
						params: { eventId: invite.eventId },
					});
				},
				onError: (error) => {
					toast.error(parseApiError(error).message);
				},
			},
		);
	}

	function handleDecline() {
		if (!invite) return;
		declineInvite.mutate(
			{ token },
			{
				onSuccess: () => setAnswer("declined"),
				onError: (error) => {
					toast.error(parseApiError(error).message);
				},
			},
		);
	}

	if (answer === "declined") {
		return (
			<Shell>
				<Card className="w-full max-w-md border-border/60 shadow-lg">
					<CardHeader className="items-center pb-2 text-center">
						<IconBox>
							<UserRoundX className="h-5 w-5" />
						</IconBox>
						<CardTitle className="text-xl">Convite recusado</CardTitle>
						<CardDescription>
							Registámos a tua recusa. Não voltas a receber lembretes deste
							convite.
						</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center pt-2">
						<Button render={<Link to="/" />} variant="outline">
							Voltar ao início
						</Button>
					</CardFooter>
				</Card>
			</Shell>
		);
	}

	if (inviteQuery.isLoading) {
		return (
			<Shell>
				<div className="flex flex-col items-center gap-3 py-24">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					<span className="text-muted-foreground text-sm">
						A validar o teu convite...
					</span>
				</div>
			</Shell>
		);
	}

	if (inviteQuery.isError) {
		const { message } = parseApiError(inviteQuery.error);
		return (
			<Shell>
				<Card className="w-full max-w-md border-border/60 shadow-lg">
					<CardHeader className="items-center pb-2 text-center">
						<IconBox variant="danger">
							<AlertTriangle className="h-5 w-5" />
						</IconBox>
						<CardTitle className="text-xl">
							Não foi possível abrir o convite
						</CardTitle>
						<CardDescription>{message}</CardDescription>
					</CardHeader>
					<CardFooter className="justify-center gap-2 pt-2">
						<Button render={<Link to="/" />} variant="outline">
							Voltar ao início
						</Button>
						<Button variant="ghost" onClick={() => inviteQuery.refetch()}>
							Tentar novamente
						</Button>
					</CardFooter>
				</Card>
			</Shell>
		);
	}

	if (!invite) return null;

	const roleLabel = invite.roleLabel ?? invite.role;
	const buttons = (
		<>
			{declineMode ? (
				<>
					<Button
						className="h-11 w-full"
						variant="outline"
						disabled={pending}
						onClick={handleDecline}
					>
						{declineInvite.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<X className="h-4 w-4" />
						)}
						Recusar convite
					</Button>
					<Button
						className="h-11 w-full"
						disabled={pending}
						onClick={handleAccept}
					>
						{acceptInvite.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Check className="h-4 w-4" />
						)}
						Aceitar convite
					</Button>
				</>
			) : (
				<>
					<Button
						className="h-11 w-full"
						disabled={pending}
						onClick={handleAccept}
					>
						{acceptInvite.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Check className="h-4 w-4" />
						)}
						Aceitar convite
					</Button>
					<Button
						className="h-11 w-full"
						variant="outline"
						disabled={pending}
						onClick={handleDecline}
					>
						{declineInvite.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<X className="h-4 w-4" />
						)}
						Recusar convite
					</Button>
				</>
			)}
		</>
	);

	return (
		<Shell>
			<Card className="w-full max-w-md border-border/60 shadow-lg">
				<CardHeader className="items-center pb-4 text-center">
					<IconBox>
						<UserRoundCheck className="h-5 w-5" />
					</IconBox>
					<CardTitle className="text-xl">
						{invite.invitedByName
							? `${invite.invitedByName} convidou-te para`
							: "Foste convidado para"}
					</CardTitle>
					<CardDescription className="font-semibold text-base text-foreground">
						{invite.eventName}
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-3">
					<DetailRow icon={<UserRound className="h-4 w-4" />}>
						Papel no evento: <strong>{roleLabel}</strong>
					</DetailRow>
					<DetailRow icon={<CalendarDays className="h-4 w-4" />}>
						Convite válido até {formatDate(invite.expiresAt)}
					</DetailRow>
				</CardContent>

				<CardFooter className="flex-col gap-2 pt-2">
					{buttons}
					<p className="pt-1 text-center text-muted-foreground text-xs">
						Ao aceitar, passas a integrar a equipa deste evento com as
						permissões do papel indicado.
					</p>
				</CardFooter>
			</Card>
		</Shell>
	);
}

/** Centered page shell: brand header + the card, on a calm background. */
function Shell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
			<div className="mb-8 flex items-center gap-2">
				<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
					M
				</span>
				<span className="font-bold tracking-tight">Muxima</span>
			</div>
			{children}
		</div>
	);
}

function IconBox({
	children,
	variant = "brand",
}: {
	children: React.ReactNode;
	variant?: "brand" | "danger";
}) {
	return (
		<span
			className={`mb-1 flex h-11 w-11 items-center justify-center rounded-full ${
				variant === "danger"
					? "bg-destructive/10 text-destructive"
					: "bg-primary/10 text-primary"
			}`}
		>
			{children}
		</span>
	);
}

function DetailRow({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-2 text-muted-foreground text-sm">
			<span className="mt-0.5 text-primary">{icon}</span>
			<span>{children}</span>
		</div>
	);
}
