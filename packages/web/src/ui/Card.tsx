import type { ComponentProps } from "react";
import { cn } from "../utils/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"rounded-xl border border-border-secondary bg-background-container shadow-card",
				className,
			)}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />
	);
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
	return (
		<h2
			className={cn("text-sm font-medium text-typography-primary", className)}
			{...props}
		/>
	);
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			className={cn("text-sm text-typography-tertiary", className)}
			{...props}
		/>
	);
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("p-5", className)} {...props} />;
}
