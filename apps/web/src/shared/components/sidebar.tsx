import { Button } from "@muxima/ui/components/button";
import { Dialog, DialogContent } from "@muxima/ui/components/dialog";
import { cn } from "@muxima/ui/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
	Bell,
	Calendar,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	FileText,
	Gift,
	Home,
	LayoutGrid,
	Package,
	Settings,
	ShoppingCart,
	TableProperties,
	Users,
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

interface NavItem {
	label: string;
	icon: React.ReactNode;
	to: string;
}

interface NavGroup {
	label: string;
	items: NavItem[];
}

const eventNavGroups: NavGroup[] = [
	{
		label: "",
		items: [
			{
				label: "Visão geral",
				icon: <Home className="h-4 w-4" />,
				to: "/events/$eventId",
			},
		],
	},
	{
		label: "Planeamento",
		items: [
			{
				label: "Orçamento",
				icon: <CreditCard className="h-4 w-4" />,
				to: "/events/$eventId/budget",
			},
			{
				label: "Fornecedores",
				icon: <ShoppingCart className="h-4 w-4" />,
				to: "/events/$eventId/suppliers",
			},
			{
				label: "Tarefas",
				icon: <LayoutGrid className="h-4 w-4" />,
				to: "/events/$eventId/tasks",
			},
			{
				label: "Cronograma",
				icon: <Calendar className="h-4 w-4" />,
				to: "/events/$eventId/schedule",
			},
		],
	},
	{
		label: "Convidados",
		items: [
			{
				label: "Lista de convidados",
				icon: <Users className="h-4 w-4" />,
				to: "/events/$eventId/guests",
			},
			{
				label: "Mesas",
				icon: <TableProperties className="h-4 w-4" />,
				to: "/events/$eventId/tables",
			},
		],
	},
	{
		label: "Logística",
		items: [
			{
				label: "Inventário",
				icon: <Package className="h-4 w-4" />,
				to: "/events/$eventId/inventory",
			},
		],
	},
	{
		label: "",
		items: [
			{
				label: "Documentos",
				icon: <FileText className="h-4 w-4" />,
				to: "/events/$eventId/documents",
			},
		],
	},
];

const globalNavGroups: NavGroup[] = [
	{
		label: "",
		items: [
			{
				label: "Dashboard",
				icon: <Home className="h-4 w-4" />,
				to: "/dashboard",
			},
			{
				label: "Eventos",
				icon: <Gift className="h-4 w-4" />,
				to: "/events",
			},
		],
	},
	{
		label: "Sistema",
		items: [
			{
				label: "Notificações",
				icon: <Bell className="h-4 w-4" />,
				to: "/notifications",
			},
			{
				label: "Configurações",
				icon: <Settings className="h-4 w-4" />,
				to: "/settings",
			},
		],
	},
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const matchRoute = useMatchRoute();
	const isEventContext = matchRoute({ to: "/events/$eventId", fuzzy: true });

	const navGroups = isEventContext ? eventNavGroups : globalNavGroups;

	const eventIdMatch = window.location.pathname.match(/\/events\/([^/]+)/);
	const eventId = eventIdMatch?.[1];

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-14 items-center px-4">
				{isEventContext && eventId ? (
					<Link
						to="/events/$eventId"
						params={{ eventId }}
						className="flex items-center gap-2 font-semibold"
						onClick={onNavigate}
					>
						<Gift className="h-5 w-5" />
						<span className="text-lg">MUXIMA</span>
					</Link>
				) : (
					<Link
						to="/dashboard"
						className="flex items-center gap-2 font-semibold"
						onClick={onNavigate}
					>
						<Gift className="h-5 w-5" />
						<span className="text-lg">MUXIMA</span>
					</Link>
				)}
			</div>

			{isEventContext && eventId && (
				<div className="px-3 pb-2">
					<Link
						to="/events"
						className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground text-xs hover:text-foreground"
						onClick={onNavigate}
					>
						← Trocar evento
					</Link>
				</div>
			)}

			<nav className="flex-1 overflow-y-auto px-3 py-2">
				{navGroups.map((group, i) => (
					<div key={group.label || i} className="mb-2">
						{group.label && (
							<p className="mb-1 px-2 pt-4 pb-1 font-medium text-muted-foreground text-xs">
								{group.label}
							</p>
						)}
						{group.items.map((item) => {
							const isActive = isEventContext
								? matchRoute({
										to: item.to,
										params: { eventId: eventId || "" },
									})
								: matchRoute({
										to: item.to,
										fuzzy: item.to !== "/dashboard",
									});
							return (
								<Link
									key={item.to}
									to={item.to}
									params={isEventContext && eventId ? { eventId } : undefined}
									onClick={onNavigate}
									className={cn(
										"flex items-center gap-3 rounded-md px-2 py-1.5 font-medium text-sm transition-colors",
										isActive
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
									)}
								>
									{item.icon}
									{item.label}
								</Link>
							);
						})}
					</div>
				))}
			</nav>

			<hr className="border-border" />

			<SidebarUserInfo />
		</div>
	);
}

function SidebarUserInfo() {
	const { data: session } = authClient.useSession();
	if (!session) return null;
	return (
		<div className="flex items-center gap-3 p-4">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-sm">
				{session.user.name?.charAt(0)?.toUpperCase() || "U"}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{session.user.name}</p>
				<p className="truncate text-muted-foreground text-xs">
					{session.user.email}
				</p>
			</div>
		</div>
	);
}

function CollapsedNav() {
	const matchRoute = useMatchRoute();
	const isEventContext = matchRoute({ to: "/events/$eventId", fuzzy: true });
	const navGroups = isEventContext ? eventNavGroups : globalNavGroups;
	const eventIdMatch = window.location.pathname.match(/\/events\/([^/]+)/);
	const eventId = eventIdMatch?.[1];

	return (
		<nav className="flex flex-col items-center gap-1 px-2">
			{navGroups
				.flatMap((g) => g.items)
				.map((item) => {
					const isActive = isEventContext
						? matchRoute({ to: item.to, params: { eventId: eventId || "" } })
						: matchRoute({
								to: item.to,
								fuzzy: item.to !== "/dashboard",
							});
					return (
						<Link
							key={item.to}
							to={item.to}
							params={isEventContext && eventId ? { eventId } : undefined}
							className={cn(
								"flex h-9 w-9 items-center justify-center rounded-md transition-colors",
								isActive
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
							)}
							title={item.label}
						>
							{item.icon}
						</Link>
					);
				})}
		</nav>
	);
}

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false);

	return (
		<aside
			className={cn(
				"hidden border-r bg-muted/40 lg:block",
				collapsed ? "w-16" : "w-60",
			)}
		>
			<div className="flex h-full flex-col">
				<div
					className={cn(
						"flex h-14 items-center",
						collapsed ? "justify-center" : "justify-end px-2",
					)}
				>
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={() => setCollapsed(!collapsed)}
					>
						{collapsed ? (
							<ChevronRight className="h-4 w-4" />
						) : (
							<ChevronLeft className="h-4 w-4" />
						)}
					</Button>
				</div>
				{collapsed ? <CollapsedNav /> : <SidebarNav />}
			</div>
		</aside>
	);
}

export function MobileSidebar() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="icon"
				className="lg:hidden"
				onClick={() => setOpen(true)}
			>
				<span className="sr-only">Abrir menu</span>
				<svg
					className="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					role="img"
					aria-label="Menu"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="w-60 p-0">
					<SidebarNav onNavigate={() => setOpen(false)} />
				</DialogContent>
			</Dialog>
		</>
	);
}
