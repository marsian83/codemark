import { cn } from "../utils/cn";

export function Logo({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-[0.4em] font-display font-semibold [font-variation-settings:'SOFT'_100]",
				className,
			)}
		>
			<img
				src="/logo.svg"
				alt=""
				className="size-[1.5em] shrink-0 max-[24rem]:hidden"
			/>
			codemark
		</span>
	);
}
