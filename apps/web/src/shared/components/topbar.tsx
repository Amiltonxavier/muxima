import { Button } from "@muxima/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { MobileSidebar } from "./sidebar";
import UserMenu from "./user-menu";

export function Topbar() {
	return (
		<header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:px-6">
			<MobileSidebar />

			<div className="flex-1" />

			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					render={<Link to="/notifications" />}
				>
					<Bell className="h-4 w-4" />
					<span className="sr-only">Notificações</span>
				</Button>
				<ModeToggle />
				<UserMenu />
			</div>
		</header>
	);
}
