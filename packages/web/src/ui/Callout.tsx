import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../utils/cn";
import { Icon, type IconName } from "./Icon";

const calloutVariants = cva(
	"flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm text-typography-secondary [&>svg]:mt-0.5",
	{
		variants: {
			tone: {
				neutral:
					"border-border-secondary bg-background-raised [&>svg]:text-typography-tertiary",
				warning: "border-warning/20 bg-warning/5 [&>svg]:text-warning",
				error: "border-error/25 bg-error/5 [&>svg]:text-error",
			},
		},
		defaultVariants: { tone: "neutral" },
	},
);

type CalloutTone = NonNullable<VariantProps<typeof calloutVariants>["tone"]>;

const iconFor: Record<CalloutTone, IconName> = {
	neutral: "info",
	warning: "alert-triangle",
	error: "circle-x",
};

const roleFor: Record<CalloutTone, "status" | "alert" | undefined> = {
	neutral: undefined,
	warning: "status",
	error: "alert",
};

export function Callout({
	className,
	tone = "neutral",
	children,
	...props
}: ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
	const t: CalloutTone = tone ?? "neutral";
	return (
		<div
			role={roleFor[t]}
			className={cn(calloutVariants({ tone: t }), className)}
			{...props}
		>
			<Icon name={iconFor[t]} />
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}
