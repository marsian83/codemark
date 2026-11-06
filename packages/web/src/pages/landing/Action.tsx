import { cva, type VariantProps } from "class-variance-authority";

export const actionVariants = cva(
	"cartouche inline-flex h-12 items-center justify-center px-6 font-text text-base font-medium whitespace-nowrap outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sand disabled:opacity-50",
	{
		variants: {
			tone: {
				fox: "bg-fox text-night hover:bg-sand",
				quiet: "bg-sand/10 text-sand hover:bg-sand/20",
				sand: "bg-sand text-night hover:bg-fox",
				night: "bg-night text-sand hover:bg-night-3",
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
