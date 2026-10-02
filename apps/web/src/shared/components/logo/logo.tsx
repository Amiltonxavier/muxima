export function Logo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 64 40"
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.25"
			aria-hidden
		>
			<circle cx="24" cy="22" r="14" />
			<circle cx="40" cy="22" r="14" />
			<path d="M40 2l3 4-3 4-3-4z" />
		</svg>
	);
}
