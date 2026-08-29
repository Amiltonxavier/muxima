import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export function Header() {
	const links = [
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/events", label: "Events" },
		{ to: "/budget", label: "Budget" },
		{ to: "/suppliers", label: "Suppliers" },
		{ to: "/guests", label: "Guests" },
		{ to: "/tables", label: "Tables" },
		{ to: "/tasks", label: "Tasks" },
		{ to: "/schedule", label: "Schedule" },
		{ to: "/inventory", label: "Inventory" },
		{ to: "/documents", label: "Documents" },
		{ to: "/notifications", label: "Notifications" },
		{ to: "/settings", label: "Settings" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
