import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Search, X } from "lucide-react";
import type {
	MemberRoleFilter,
	MemberStatusFilter,
} from "../-types/member.types";
import { MEMBER_ROLE_OPTIONS } from "../-utils/member.utils";

const STATUS_OPTIONS: Array<{ value: MemberStatusFilter; label: string }> = [
	{ value: "ALL", label: "Todos os estados" },
	{ value: "ACTIVE", label: "Ativos" },
	{ value: "PENDING", label: "Pendentes" },
];

export function MembersFilters({
	search,
	role,
	status,
	hasActiveFilters,
	onSearchChange,
	onRoleChange,
	onStatusChange,
	onReset,
}: {
	search: string;
	role: MemberRoleFilter;
	status: MemberStatusFilter;
	hasActiveFilters: boolean;
	onSearchChange: (value: string) => void;
	onRoleChange: (value: MemberRoleFilter) => void;
	onStatusChange: (value: MemberStatusFilter) => void;
	onReset: () => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[220px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar por nome ou email..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>

			<Select
				value={role}
				onValueChange={(v) => {
					if (v) onRoleChange(v as MemberRoleFilter);
				}}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Papel" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="ALL">Todos os papéis</SelectItem>
					{MEMBER_ROLE_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={status}
				onValueChange={(v) => {
					if (v) onStatusChange(v as MemberStatusFilter);
				}}
			>
				<SelectTrigger className="w-[170px]">
					<SelectValue placeholder="Estado" />
				</SelectTrigger>
				<SelectContent>
					{STATUS_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasActiveFilters && (
				<Button variant="ghost" size="sm" onClick={onReset}>
					<X className="mr-1.5 h-3.5 w-3.5" />
					Limpar
				</Button>
			)}
		</div>
	);
}
