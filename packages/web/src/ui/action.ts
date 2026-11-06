import { cva, type VariantProps } from "class-variance-authority";

export const actionVariants = cva(
	"cartouche inline-flex h-12 cursor-pointer items-center justify-center px-6 font-text text-base font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sand disabled:opacity-50",
	{
		variants: {
			tone: {
				fox: "bg-fox text-night hover:bg-sand focus-visible:ring-night",
				quiet: "bg-sand/10 text-sand hover:bg-sand/20",
				sand: "bg-sand text-night hover:bg-fox focus-visible:ring-night",
				night: "bg-night-3 text-sand hover:bg-sand hover:text-night",
			},
			size: {
				md: "h-12 px-6 text-base",
				sm: "h-9 px-4 text-sm [--chamfer:0.375rem]",
			},
		},
		defaultVariants: { tone: "fox", size: "md" },
	},
);

export type ActionVariants = VariantProps<typeof actionVariants>;
