import { PERMISSIONS, type Permission } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Dialog, DialogContent } from "@muxima/ui/components/dialog";
import { cn } from "@muxima/ui/lib/utils";
import { Link, useMatchRoute, useParams } from "@tanstack/react-router";
import {
	ArrowLeft,
	Bell,
	Calculator,
	Calendar,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Feather,
	Gift,
	Handshake,
	Home,
	LayoutGrid,
	ListChecks,
	Package,
	Settings,
	ShoppingCart,
	TableProperties,
	User,
	Users,
	UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAccountPermissions, useEventAccess } from "../hooks/use-can";
import { initials } from "../utils/string";
import { filterNavGroups, type NavGroup } from "./nav-permissions";

const eventNavGroups: NavGroup[] = [
	{
		label: "",
		items: [
			{
				label: "Visão geral",
				icon: <Home className="h-4 w-4" />,
				to: "/events/$eventId",
				permission: PERMISSIONS.EVENT_READ,
			},
		],
	},
	{
		label: "Planeamento",
		items: [
			{
				label: "Orçamento",
				icon: <Calculator className="h-4 w-4" />,
				to: "/events/$eventId/budget",
				permission: PERMISSIONS.BUDGET_READ,
			},
			{
				label: "Fornecedores",
				icon: <Handshake className="h-4 w-4" />,
				to: "/events/$eventId/suppliers",
				permission: PERMISSIONS.SUPPLIER_READ,
			},
			{
				label: "Tarefas",
				icon: <LayoutGrid className="h-4 w-4" />,
				to: "/events/$eventId/tasks",
				permission: PERMISSIONS.TASK_READ,
			},
			{
				label: "Cronograma",
				icon: <Calendar className="h-4 w-4" />,
				to: "/events/$eventId/schedule",
				permission: PERMISSIONS.SCHEDULE_READ,
			},
			{
				label: "Alimentação",
				icon: <UtensilsCrossed className="h-4 w-4" />,
				to: "/events/$eventId/food-plan",
				permission: PERMISSIONS.FOOD_PLAN_READ,
			},
			{
				label: "Checklist",
				icon: <ListChecks className="h-4 w-4" />,
				to: "/events/$eventId/checklist",
				permission: PERMISSIONS.CHECKLIST_READ,
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
				permission: PERMISSIONS.GUEST_READ,
			},
			{
				label: "Mesas",
				icon: <TableProperties className="h-4 w-4" />,
				to: "/events/$eventId/tables",
				permission: PERMISSIONS.TABLE_READ,
			},
		],
	},
	{
		label: "Memoráveis",
		items: [
			{
				label: "Dedicatórias & Votos",
				icon: <Feather className="h-4 w-4" />,
				to: "/events/$eventId/dedications",
				permission: PERMISSIONS.DEDICATION_READ,
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
				permission: PERMISSIONS.INVENTORY_READ,
			},
		],
	},
	{
		label: "Equipa",
		items: [
			{
				label: "Membros",
				icon: <Users className="h-4 w-4" />,
				to: "/events/$eventId/members",
				permission: PERMISSIONS.MEMBER_READ,
			},
		],
	},
];

const globalNavGroups: NavGroup[] = [
	{
		label: "",
		items: [
			{ label: "Dashboard", icon: <Home className="h-4 w-4" />, to: "/" },
			{
				label: "Eventos",
				icon: <CalendarDays className="h-4 w-4" />,
				to: "/events",
				permission: PERMISSIONS.EVENT_READ,
			},
			{
				label: "Perfil",
				icon: <User className="h-4 w-4" />,
				to: "/profile",
				permission: PERMISSIONS.PROFILE_READ,
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
				permission: PERMISSIONS.NOTIFICATION_READ,
			},
			{
				label: "Configurações",
				icon: <Settings className="h-4 w-4" />,
				to: "/settings",
				permission: PERMISSIONS.PROFILE_READ,
			},
		],
	},
];

/**
 * The groups the caller may actually see, already filtered.
 *
 * The event menu needs the caller's grants IN THAT EVENT: the session's union
 * would offer a VIEWER the sections their OWNER membership elsewhere unlocks,
 * and every one of those clicks would 403. The global menu is account-level, so
 * it uses the session instead.
 *
 * Both hooks are called unconditionally and the result picked afterwards,
 * because the number of hooks a render runs may not change with the route — and
 * here it does: `isEventContext` flips between the two menus.
 */
function useVisibleNavGroups(isEventContext: boolean): NavGroup[] {
	const params = useParams({ strict: false }) as
		| { eventId?: string }
		| undefined;
	const eventId = params?.eventId;

	const { permissions: eventPermissions } = useEventAccess(
		isEventContext ? eventId : undefined,
	);
	const accountPermissions = useAccountPermissions();

	const granted = new Set<Permission>(
		isEventContext ? eventPermissions : accountPermissions,
	);

	return filterNavGroups(
		isEventContext ? eventNavGroups : globalNavGroups,
		granted,
	);
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
	const matchRoute = useMatchRoute();
	const isEventContext = matchRoute({ to: "/events/$eventId", fuzzy: true });

	const navGroups = useVisibleNavGroups(!!isEventContext);

	const eventId = useParams({ strict: false }) as
		| { eventId?: string }
		| undefined;

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-14 items-center px-4">
				{isEventContext && eventId?.eventId ? (
					<Link
						to="/events/$eventId"
						params={{ eventId: eventId.eventId }}
						className="flex items-center gap-2 font-semibold"
						onClick={onNavigate}
					>
						<Gift className="h-5 w-5" />
						<span className="text-lg">MUXIMA</span>
					</Link>
				) : (
					<Link
						to="/"
						className="flex items-center gap-2 font-semibold"
						onClick={onNavigate}
					>
						<Gift className="h-5 w-5" />
						<span className="text-lg">MUXIMA</span>
					</Link>
				)}
			</div>

			{isEventContext && eventId?.eventId && (
				<div className="px-3 pb-2">
					<Link
						to="/events"
						className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground text-xs hover:text-foreground"
						onClick={onNavigate}
					>
						<ArrowLeft size={12} /> Trocar evento
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
										fuzzy: item.to !== "/",
									});
							return (
								<Link
									key={item.to}
									to={item.to}
									params={
										isEventContext && eventId?.eventId
											? { eventId: eventId.eventId }
											: undefined
									}
									onClick={onNavigate}
									className={cn(
										"flex items-center gap-3 px-2 py-1.5 font-medium text-sm transition-colors",
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
				{initials(session.user.name) || "U"}
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
	const navGroups = useVisibleNavGroups(!!isEventContext);
	const params = useParams({ strict: false }) as
		| { eventId?: string }
		| undefined;
	const eventId = params?.eventId;

	return (
		<nav className="flex flex-col items-center gap-1 px-2">
			{navGroups
				.flatMap((g) => g.items)
				.map((item) => {
					const isActive = isEventContext
						? matchRoute({ to: item.to, params: { eventId: eventId || "" } })
						: matchRoute({
								to: item.to,
								fuzzy: item.to !== "/",
							});
					return (
						<Link
							key={item.to}
							to={item.to}
							params={isEventContext && eventId ? { eventId } : undefined}
							className={cn(
								"flex h-9 w-9 items-center justify-center transition-colors",
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
