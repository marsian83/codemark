import type { ComponentProps } from "react";
import { cn } from "../utils/cn";

export const fieldClass =
	"h-10 rounded-lg border border-border-primary bg-background-container px-3 text-sm text-typography-primary transition-colors duration-150 placeholder:text-typography-tertiary hover:border-typography-tertiary/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 aria-invalid:border-error aria-invalid:ring-error/15";

export function Input({ className, ...props }: ComponentProps<"input">) {
	return <input className={cn(fieldClass, "w-full", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
	return (
		<select
			className={cn(fieldClass, "appearance-none pr-8", className)}
			{...props}
		/>
	);
}
