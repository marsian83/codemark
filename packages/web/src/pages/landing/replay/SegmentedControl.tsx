import { ToggleGroup } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";

type SegmentedControlProps<Value extends string> = {
	value: Value;
	onValueChange: (value: Value) => void;
	options: readonly { value: Value; label: ReactNode }[];
	"aria-label": string;
	className?: string;
};

export function SegmentedControl<Value extends string>({
	value,
	onValueChange,
	options,
	className,
	"aria-label": ariaLabel,
}: SegmentedControlProps<Value>) {
	return (
		<ToggleGroup.Root
			type="single"
			value={value}
			onValueChange={(next) => {
				const option = options.find((item) => item.value === next);
				if (option) onValueChange(option.value);
			}}
			aria-label={ariaLabel}
			className={cn("flex flex-wrap items-center gap-1", className)}
		>
			{options.map((option) => (
				<ToggleGroup.Item
					key={option.value}
					value={option.value}
					className="cartouche h-10 px-4 text-sm font-medium whitespace-nowrap text-sand-2 outline-none transition-colors [--chamfer:0.375rem] hover:text-sand focus-visible:bg-sand/10 data-[state=on]:bg-sand/15 data-[state=on]:text-sand"
				>
					{option.label}
				</ToggleGroup.Item>
			))}
		</ToggleGroup.Root>
	);
}
