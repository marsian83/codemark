import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Icon, type IconName } from "../ui/Icon";
import { cn } from "../utils/cn";
import { Logo } from "./Logo";

export const pageWidth = "mx-auto w-full max-w-[84rem] px-5 sm:px-10";

export type HeaderLink = {
	label: string;
	to?: string;
	href?: string;
	end?: boolean;
	icon?: IconName;
	desktopOnly?: boolean;
};

const linkTone = {
	landing: "transition-colors hover:text-fox",
	app: "inline-flex items-center gap-1.5 text-typography-secondary transition-colors hover:text-typography-primary aria-[current=page]:text-typography-primary max-sm:[&_svg]:hidden",
};

export function SiteHeaderRow({
	links,
	action,
	tag,
	tone = "app",
}: {
	links: HeaderLink[];
	action?: ReactNode;
	tag?: ReactNode;
	tone?: keyof typeof linkTone;
}) {
	return (
		<div
			className={cn(
				pageWidth,
				"relative flex h-20 items-center justify-between gap-4",
			)}
		>
			<div className="flex min-w-0 items-center gap-3">
				<Link to="/" className="flex">
					<Logo className="text-2xl" />
				</Link>
				{tag}
			</div>
			<nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
				{links.map((link) => {
					const className = cn(
						linkTone[tone],
						link.desktopOnly && "max-sm:hidden",
					);
					const icon = link.icon && <Icon key="icon" name={link.icon} />;
					return link.to ? (
						<NavLink
							key={link.label}
							to={link.to}
							end={link.end}
							className={className}
						>
							{icon}
							{link.label}
						</NavLink>
					) : (
						<a
							key={link.label}
							href={link.href}
							target="_blank"
							rel="noreferrer"
							className={className}
						>
							{icon}
							{link.label}
						</a>
					);
				})}
				{action}
			</nav>
		</div>
	);
}
