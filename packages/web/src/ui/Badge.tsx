import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../utils/cn";

export const badgeVariants = cva(
	"inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium [&_svg]:size-3.5",
	{
		variants: {
			tone: {
				neutral: "bg-background-raised text-typography-secondary",
				primary: "bg-primary/10 text-primary",
				success: "bg-success/10 text-success",
				caution: "bg-caution/12 text-caution",
				warning: "bg-warning/10 text-warning",
				error: "bg-error/10 text-error",
			},
		},
		defaultVariants: { tone: "neutral" },
	},
);

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
	className,
	tone,
	...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
