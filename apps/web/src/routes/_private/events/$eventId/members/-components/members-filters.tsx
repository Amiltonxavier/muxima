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
import type { MemberRoleFilter } from "../-types/member.types";
import { MEMBER_ROLE_OPTIONS } from "../-utils/member.utils";

/**
 * Search + role filters.
 *
 * The status axis is not here: it is the Ativos/Pendentes/Cancelados tabs,
 * which filter the list server-side. A second status control next to them would
 * fight the tabs (a server filter that empties every other tab).
 */
export function MembersFilters({
	search,
	role,
	hasActiveFilters,
	onSearchChange,
	onRoleChange,
	onReset,
}: {
	search: string;
	role: MemberRoleFilter;
	hasActiveFilters: boolean;
	onSearchChange: (value: string) => void;
	onRoleChange: (value: MemberRoleFilter) => void;
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

			{hasActiveFilters && (
				<Button variant="ghost" size="sm" onClick={onReset}>
					<X className="mr-1.5 h-3.5 w-3.5" />
					Limpar
				</Button>
			)}
		</div>
	);
}
