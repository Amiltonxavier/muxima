import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { LoadingState } from "@/shared/components/states/loading-state";

function Rings({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 64 40"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			aria-hidden
		>
			<circle cx="24" cy="22" r="14" />
			<circle cx="40" cy="22" r="14" />
			<path d="M40 2l3 4-3 4-3-4z" />
		</svg>
	);
}

const LEAVES = [
	{ y: 300, a: -55 },
	{ y: 280, a: 55 },
	{ y: 250, a: -50 },
	{ y: 228, a: 52 },
	{ y: 196, a: -48 },
	{ y: 174, a: 50 },
	{ y: 142, a: -44 },
	{ y: 120, a: 46 },
	{ y: 90, a: -38 },
	{ y: 70, a: 40 },
	{ y: 40, a: -25 },
	{ y: 28, a: 25 },
];

function Branch({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 200 320"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			strokeLinecap="round"
			aria-hidden
		>
			<path d="M100 320V14" />
			{LEAVES.map((l) => (
				<ellipse
					key={l.y}
					cx="0"
					cy="-15"
					rx="6"
					ry="15"
					transform={`translate(100 ${l.y}) rotate(${l.a})`}
				/>
			))}
			<ellipse cx="100" cy="6" rx="5" ry="11" />
		</svg>
	);
}

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		try {
			const { data: session } = await authClient.getSession();
			if (session) {
				throw redirect({ to: "/" });
			}
		} catch (e) {
			// If it's a redirect from TanStack Router, rethrow it
			if (e && typeof e === "object" && "isRedirect" in e) {
				throw e;
			}
			// On error, let the user see the auth page
			return;
		}
	},
	pendingComponent: LoadingState,
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
			{/* Painel esquerdo */}
			<aside className="relative hidden overflow-hidden bg-primary text-white lg:block">
				{/* Fotografia */}
				<img
					src="/auth-wedding.jpg"
					alt=""
					className="absolute inset-0 h-full w-full object-cover"
				/>

				{/* Overlays: cor da marca + gradiente para legibilidade */}
				<div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
				<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/40" />

				{/* Moldura interior */}
				<div className="pointer-events-none absolute inset-6 rounded-sm border border-white/30" />

				{/* Ramos decorativos nos cantos */}
				<Branch className="pointer-events-none absolute -top-6 right-10 h-56 rotate-[28deg] text-white/40" />
				<Branch className="pointer-events-none absolute -bottom-6 left-10 h-44 -rotate-[152deg] text-white/25" />

				{/* Conteúdo */}
				<div className="relative flex h-full flex-col justify-between p-14">
					<div className="flex items-center gap-3">
						<Rings className="h-7 text-white" />
						<span className="font-display text-2xl tracking-wide">Muxima</span>
					</div>

					<div className="max-w-md space-y-5">
						<div className="flex items-center gap-3 text-white/70">
							<span className="h-px w-10 bg-white/50" />
							<span className="text-xs uppercase tracking-[0.3em]">
								Noivado &amp; Casamento
							</span>
						</div>
						<h1 className="font-display text-5xl leading-[1.1]">
							Cada detalhe do vosso grande dia, num só lugar.
						</h1>
						<p className="text-base text-white/75 leading-relaxed">
							Convidados, orçamento, fornecedores e tarefas organizados para que
							possam viver o noivado sem stress.
						</p>
					</div>

					<p className="text-sm text-white/50">
						© {new Date().getFullYear()} Muxima
					</p>
				</div>
			</aside>

			{/* Painel direito */}
			<main className="flex items-center justify-center bg-background px-6 py-12 sm:px-12">
				<div className="w-full max-w-sm">
					<div className="mb-10 flex items-center gap-2.5 lg:hidden">
						<Rings className="h-5 text-foreground" />
						<span className="font-display text-xl">Muxima</span>
					</div>
					<Outlet />
				</div>
			</main>
		</div>
	);
}
