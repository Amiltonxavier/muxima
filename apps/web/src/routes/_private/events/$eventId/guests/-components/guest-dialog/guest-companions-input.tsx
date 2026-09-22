import { Button } from "@muxima/ui/components/button";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Plus, Users, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { guestCompanionSchema } from "@/utils/guest-schemas";

export function GuestCompanionsInput({
	names,
	onChange,
	disabled,
}: {
	names: string[];
	onChange: (names: string[]) => void;
	disabled?: boolean;
}) {
	const [input, setInput] = useState("");

	const addName = () => {
		const name = input.trim();
		if (!name) return;
		const result = guestCompanionSchema.safeParse({ name });
		if (!result.success) {
			toast.error(result.error.issues[0].message);
			return;
		}
		onChange([...names, name]);
		setInput("");
	};

	const removeName = (index: number) => {
		onChange(names.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			<Label className="flex items-center gap-2">
				<Users className="h-4 w-4" />
				Acompanhantes
			</Label>
			<div className="flex gap-2">
				<Input
					placeholder="Nome do acompanhante"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							addName();
						}
					}}
					disabled={disabled}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addName}
					disabled={!input.trim() || disabled}
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
			{names.length > 0 && (
				<div className="space-y-1.5">
					{names.map((name, idx) => (
						<div
							key={`${name}-${idx}`}
							className="flex items-center justify-between rounded-md border px-3 py-1.5"
						>
							<span className="text-sm">{name}</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="h-6 w-6 text-destructive"
								onClick={() => removeName(idx)}
							>
								<X className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
