import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../utils/cn";
import { Spinner } from "./Spinner";

export const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-98 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
	{
		variants: {
			variant: {
				primary:
					"bg-typography-primary text-typography-invert hover:bg-typography-primary/85",
				accent: "bg-primary text-typography-invert hover:bg-primary-hover",
				secondary:
					"border border-border-primary bg-background-container text-typography-primary hover:bg-background-raised",
				ghost:
					"text-typography-secondary hover:bg-background-raised hover:text-typography-primary",
			},
			size: {
				xs: "h-7 rounded-md px-2 text-xs [&_svg]:size-3.5",
				sm: "h-8 px-3 text-sm",
				md: "h-10 px-4 text-sm",
				lg: "h-11 px-5 text-sm",
				icon: "size-8",
			},
		},
		defaultVariants: { variant: "primary", size: "md" },
	},
);

type ButtonProps = ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		loading?: boolean;
	};

export function Button({
	className,
	variant,
	size,
	asChild = false,
	loading = false,
	disabled,
	type = "button",
	children,
	...props
}: ButtonProps) {
	if (asChild) {
		return (
			<Slot.Root
				className={cn(buttonVariants({ variant, size }), className)}
				{...props}
			>
				{children}
			</Slot.Root>
		);
	}
	return (
		<button
			type={type}
			disabled={disabled || loading}
			aria-busy={loading || undefined}
			className={cn(buttonVariants({ variant, size }), className)}
			{...props}
		>
			{loading ? <Spinner /> : null}
			{children}
		</button>
	);
}
