import { Input } from "@muxima/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Search } from "lucide-react";
import { INVITATION_RESPONSE_FILTER_OPTIONS } from "../../-constants/guest.constants";
import type { InvitationResponseFilter } from "../../-types/invitation.types";

export function InvitationsFilters({
	search,
	response,
	onSearchChange,
	onResponseChange,
}: {
	search: string;
	response: InvitationResponseFilter;
	onSearchChange: (value: string) => void;
	onResponseChange: (value: InvitationResponseFilter) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<div className="relative min-w-[200px] max-w-sm flex-1">
				<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar por nome do convidado..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={response}
				onValueChange={(v) => {
					if (v) onResponseChange(v as InvitationResponseFilter);
				}}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Resposta" />
				</SelectTrigger>
				<SelectContent>
					{INVITATION_RESPONSE_FILTER_OPTIONS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
