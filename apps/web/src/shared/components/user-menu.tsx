import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@muxima/ui/components/alert-dialog";
import { Button } from "@muxima/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@muxima/ui/components/dropdown-menu";
import { Skeleton } from "@muxima/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { initials } from "@/shared/utils/string";

/**
 * Avatar do utilizador: imagem quando existe, iniciais como fallback. Sem
 * enfeites — apenas a inicial para dar escala ao cabeçalho do menu.
 */
function UserAvatar({
	name,
	image,
	className,
}: {
	name: string;
	image?: string | null;
	className?: string;
}) {
	if (image) {
		return (
			<img
				src={image}
				alt=""
				aria-hidden="true"
				className={`shrink-0 object-cover ${className ?? "h-7 w-7"}`}
			/>
		);
	}

	return (
		<span
			aria-hidden="true"
			className={`flex shrink-0 items-center justify-center bg-muted font-medium text-muted-foreground ${
				className ?? "h-7 w-7 text-xs"
			}`}
		>
			{initials(name) || <UserRound className="h-4 w-4" />}
		</span>
	);
}

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const [showSignOutDialog, setShowSignOutDialog] = useState(false);

	if (isPending) {
		return <Skeleton className="h-8 w-32" />;
	}

	if (!session) {
		return (
			<Link to="/login">
				<Button variant="outline" size="sm">
					Entrar
				</Button>
			</Link>
		);
	}

	const { name, email, image } = session.user;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="sm"
							className="h-8 gap-2 px-2 font-normal"
						/>
					}
				>
					<UserAvatar name={name} image={image} />
					<span className="hidden max-w-32 truncate text-sm sm:inline">
						{name}
					</span>
				</DropdownMenuTrigger>

				<DropdownMenuContent className="w-60" align="end">
					{/* Identidade no topo: avatar, nome e email juntos, para que a
					    hierarquia do menu não repita o cabeçalho do trigger. */}
					<div className="flex items-center gap-3 px-2 py-2">
						<UserAvatar name={name} image={image} className="h-9 w-9" />

						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">{name}</p>
							<p className="truncate text-muted-foreground text-xs">{email}</p>
						</div>
					</div>

					<DropdownMenuSeparator />

					<DropdownMenuGroup>
						<DropdownMenuLabel>A minha conta</DropdownMenuLabel>

						<DropdownMenuItem render={<Link to="/profile" />} className="gap-2">
							Dados da conta
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							className="text-destructive"
							onClick={() => setShowSignOutDialog(true)}
						>
							Terminar sessão
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Fica fora do dropdown de propósito: a confirmação substitui o menu
			    em ecrã, em vez de ser desenhada dentro dele. */}
			<AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Terminar sessão?</AlertDialogTitle>
						<AlertDialogDescription>
							Vai sair da sua conta neste dispositivo. Terá de entrar novamente
							com o email e a palavra-passe.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											navigate({ to: "/" });
										},
									},
								});
							}}
						>
							Terminar sessão
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
