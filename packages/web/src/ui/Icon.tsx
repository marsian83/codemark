import {
	IconAlertTriangle,
	IconArrowRight,
	IconArrowUpRight,
	IconBrandGithub,
	IconCheck,
	IconChevronDown,
	IconCircleCheck,
	IconCircleDashed,
	IconCircleX,
	IconClock,
	IconCopy,
	IconInfoCircle,
	IconKey,
	IconLoader2,
	IconLock,
	IconMinus,
	IconPin,
	IconPlus,
	IconPuzzle,
	IconRefresh,
	IconRosetteDiscountCheck,
	IconSearch,
	IconShieldCheck,
	IconShieldX,
	IconTerminal,
	IconWallet,
	IconX,
} from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { cn } from "../utils/cn";

const icons = {
	"alert-triangle": IconAlertTriangle,
	"arrow-right": IconArrowRight,
	"arrow-up-right": IconArrowUpRight,
	check: IconCheck,
	"chevron-down": IconChevronDown,
	"circle-check": IconCircleCheck,
	"circle-dashed": IconCircleDashed,
	"circle-x": IconCircleX,
	clock: IconClock,
	close: IconX,
	copy: IconCopy,
	github: IconBrandGithub,
	info: IconInfoCircle,
	key: IconKey,
	loader: IconLoader2,
	lock: IconLock,
	minus: IconMinus,
	pin: IconPin,
	plus: IconPlus,
	puzzle: IconPuzzle,
	refresh: IconRefresh,
	search: IconSearch,
	seal: IconRosetteDiscountCheck,
	"shield-check": IconShieldCheck,
	"shield-x": IconShieldX,
	terminal: IconTerminal,
	wallet: IconWallet,
};

export type IconName = keyof typeof icons;

type IconProps = Omit<ComponentProps<"svg">, "stroke"> & { name: IconName };

export function Icon({ name, className, ...props }: IconProps) {
	const Component = icons[name];
	return (
		<Component
			aria-hidden
			stroke={1.5}
			className={cn("size-4 shrink-0", className)}
			{...props}
		/>
	);
}
