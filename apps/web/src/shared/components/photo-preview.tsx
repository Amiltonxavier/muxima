import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PhotoUploadProps {
	value: File | null;
	onChange: (file: File | null) => void;
	photoUrl?: string | null;
	size?: number;
	accept?: string;
	disabled?: boolean;
}

export function PhotoUpload({
	value,
	onChange,
	photoUrl,
	size = 120,
	accept = "image/*",
	disabled = false,
}: PhotoUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!value) {
			setPreviewUrl(null);
			return;
		}

		const url = URL.createObjectURL(value);
		setPreviewUrl(url);

		return () => URL.revokeObjectURL(url);
	}, [value]);

	const imageUrl = previewUrl || photoUrl;

	const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;

		if (!file) return;

		onChange(file);
		event.target.value = "";
	};

	const handleRemove = () => {
		onChange(null);

		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	return (
		<div className="flex flex-col items-center gap-2">
			<div
				className="relative shrink-0"
				style={{
					width: size,
					height: size,
				}}
			>
				<button
					type="button"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
					className="group h-full w-full overflow-hidden rounded-full border border-gray-200 bg-gray-50 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
					aria-label={imageUrl ? "Alterar fotografia" : "Adicionar fotografia"}
				>
					{imageUrl ? (
						<img
							src={imageUrl}
							alt="Fotografia"
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
							<ImagePlus className="h-7 w-7" />
							<span className="text-xs">Adicionar foto</span>
						</div>
					)}
				</button>

				{imageUrl && (
					<button
						type="button"
						disabled={disabled}
						onClick={handleRemove}
						aria-label="Remover fotografia"
						className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				)}

				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={handleSelect}
					disabled={disabled}
					className="hidden"
				/>
			</div>

			{imageUrl && (
				<button
					type="button"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
					className="font-medium text-gray-500 text-xs hover:text-gray-900 disabled:opacity-50"
				>
					Alterar fotografia
				</button>
			)}
		</div>
	);
}
