import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CalendarDays, Mail, ShieldCheck, User } from "lucide-react";

import { formatDate } from "@/utils/format-date";
import type { ProfileItem } from "../-types/profile.types";
import {
	ACCOUNT_STATUS_LABELS,
	type AccountStatus,
} from "../-types/profile.types";

type Detail = {
	icon: typeof User;
	label: string;
	value: string;
};

export function ProfileDetailsSection({ profile }: { profile: ProfileItem }) {
	const status = (profile.status ?? "ACTIVE") as AccountStatus;
	const security = profile.security;

	const details: Detail[] = [
		{
			icon: User,
			label: "Nome",
			value: profile.name || "—",
		},
		{ icon: Mail, label: "Email", value: profile.email || "—" },
		{
			icon: CalendarDays,
			label: "Membro desde",
			value: profile.createdAt ? formatDate(String(profile.createdAt)) : "—",
		},
	];

	return (
		<Card className="max-w-lg">
			<CardHeader>
				<CardTitle>Detalhes da conta</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<dl className="divide-y">
					{details.map((detail) => (
						<div
							key={detail.label}
							className="flex items-center gap-3 py-3 first:pt-0"
						>
							<detail.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
							<dt className="text-muted-foreground text-sm">{detail.label}</dt>
							<dd className="ml-auto truncate font-medium text-sm">
								{detail.value}
							</dd>
						</div>
					))}
				</dl>

				<div className="flex items-center gap-3 border-t pt-4">
					<ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
					<div className="flex-1">
						<p className="text-muted-foreground text-sm">Estado da conta</p>
						<p className="font-medium text-sm">
							{ACCOUNT_STATUS_LABELS[status] ?? status}
						</p>
					</div>
					{security?.activeSessions !== undefined && (
						<p className="text-muted-foreground text-xs">
							{security.activeSessions} sessão(ões) ativa(s)
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
