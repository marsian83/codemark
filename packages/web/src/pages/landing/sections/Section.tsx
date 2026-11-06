import type { ComponentProps } from "react";
import { cn } from "../../../utils/cn";

export function Section({
	className,
	children,
	...props
}: ComponentProps<"section">) {
	return (
		<section
			data-section-stop
			className={cn(
				"mx-auto w-full max-w-[84rem] px-5 py-20 sm:px-10 sm:py-28",
				className,
			)}
			{...props}
		>
			{children}
		</section>
	);
}

const headingSizes = {
	lg: "text-[clamp(2.5rem,min(5.4vw,9.5dvh),4.75rem)] leading-[1.05]",
	md: "text-[clamp(2.25rem,min(4vw,7.5dvh),3.5rem)] leading-[1.08]",
};

export function Heading({
	className,
	size = "lg",
	...props
}: ComponentProps<"h2"> & { size?: keyof typeof headingSizes }) {
	return (
		<h2
			className={cn(
				"max-w-5xl font-display text-balance",
				headingSizes[size],
				className,
			)}
			{...props}
		/>
	);
}

export function Lede({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn("max-w-2xl text-lg leading-8 text-sand", className)}
			{...props}
		/>
	);
}
