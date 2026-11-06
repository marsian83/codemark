import {
	IconAlertTriangle,
	IconArrowRight,
	IconArrowUpRight,
	IconBook2,
	IconBrandGithub,
	IconCheck,
	IconChevronDown,
	IconCircleCheck,
	IconCircleDashed,
	IconCircleX,
	IconClock,
	IconCopy,
	IconHelpCircle,
	IconInfoCircle,
	IconKey,
	IconLoader2,
	IconLock,
	IconMinus,
	IconPin,
	IconPinnedOff,
	IconPlayerPlay,
	IconPlus,
	IconPuzzle,
	IconRefresh,
	IconRosetteDiscountCheck,
	IconSearch,
	IconShieldCheck,
	IconShieldX,
	IconStack2,
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
	book: IconBook2,
	check: IconCheck,
	"chevron-down": IconChevronDown,
	"circle-check": IconCircleCheck,
	"circle-dashed": IconCircleDashed,
	"circle-x": IconCircleX,
	clock: IconClock,
	close: IconX,
	copy: IconCopy,
	github: IconBrandGithub,
	help: IconHelpCircle,
	info: IconInfoCircle,
	key: IconKey,
	loader: IconLoader2,
	lock: IconLock,
	minus: IconMinus,
	pin: IconPin,
	"pin-off": IconPinnedOff,
	play: IconPlayerPlay,
	plus: IconPlus,
	puzzle: IconPuzzle,
	refresh: IconRefresh,
	search: IconSearch,
	seal: IconRosetteDiscountCheck,
	"shield-check": IconShieldCheck,
	"shield-x": IconShieldX,
	stack: IconStack2,
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
