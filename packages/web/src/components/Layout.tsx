import { Link, Outlet } from "react-router-dom";
import { config } from "../lib/config";
import { buttonVariants } from "../ui/Button";
import { cn } from "../utils/cn";
import { type HeaderLink, pageWidth, SiteHeaderRow } from "./SiteHeader";

const links: HeaderLink[] = [
	{ label: "Check", to: "/app", end: true, icon: "shield-check" },
	{ label: "Demo", to: "/demo", icon: "play" },
	{ label: "Docs", to: "/app/docs", icon: "book" },
	{ label: "GitHub", href: config.repoUrl, icon: "github", desktopOnly: true },
];

export const headerSurface =
	"sticky top-0 z-20 bg-background-layout shadow-[inset_0_-0.0625rem_0_var(--color-border-secondary)]";

export const shellSurface =
	"flex min-h-dvh flex-col bg-background-layout font-sans text-sm text-typography-primary antialiased";

export const headerAction = cn(
	buttonVariants({ variant: "secondary" }),
	"h-12 px-6 max-lg:hidden",
);

export default function Layout() {
	return (
		<div className={shellSurface}>
			<header className={headerSurface}>
				<SiteHeaderRow
					links={links}
					action={
						<Link to="/demo" className={headerAction}>
							Try the demo
						</Link>
					}
				/>
			</header>
			<div className={cn(pageWidth, "flex-1 py-8 sm:py-10")}>
				<Outlet />
			</div>
			<footer className="border-t border-border-secondary">
				<div
					className={cn(
						pageWidth,
						"flex flex-wrap justify-between gap-x-6 gap-y-1 py-5 text-xs text-typography-tertiary",
					)}
				>
					<span>Checks ENS on Sepolia straight from your browser</span>
					<span>No Codemark server sees what you check</span>
				</div>
			</footer>
		</div>
	);
}
