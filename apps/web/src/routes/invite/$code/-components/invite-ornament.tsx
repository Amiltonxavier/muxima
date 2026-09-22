export function InviteOrnament({ className }: { className?: string }) {
	return (
		<div
			className={`flex items-center justify-center gap-3 ${className ?? ""}`}
			aria-hidden="true"
		>
			<span className="ornament-rule h-px w-10 sm:w-14" />
			<span className="inline-block h-1.5 w-1.5 rotate-45 border border-[color:var(--ip-accent)]" />
			<span className="ornament-rule h-px w-10 sm:w-14" />
		</div>
	);
}
