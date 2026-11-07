import { Link, NavLink, Outlet } from "react-router-dom";
import { BasePathProvider } from "../lib/basePath";
import { config } from "../lib/config";
import { demoTeam } from "../lib/demo";
import { Badge } from "../ui/Badge";
import { Icon, type IconName } from "../ui/Icon";
import { cn } from "../utils/cn";
import { headerAction, headerSurface, shellSurface } from "./Layout";
import { pageWidth, SiteHeaderRow } from "./SiteHeader";

const tabs: { to: string; label: string; end: boolean; icon: IconName }[] = [
	{ to: "/demo", label: "Contract checks", end: true, icon: "shield-check" },
	{ to: "/demo/upgrade", label: "Account upgrade", end: false, icon: "wallet" },
];

export default function DemoLayout() {
	return (
		<BasePathProvider value="/demo">
			<div className={shellSurface}>
				<header className={headerSurface}>
					<SiteHeaderRow
						tag={<Badge tone="primary">Demo</Badge>}
						links={[
							{
								label: "Docs",
								to: "/app/docs",
								icon: "book",
								desktopOnly: true,
							},
							{
								label: "GitHub",
								href: config.repoUrl,
								icon: "github",
								desktopOnly: true,
							},
						]}
						action={
							<Link
								to="/app"
								className={cn(headerAction, "max-lg:inline-flex")}
							>
								Leave demo
							</Link>
						}
					/>
				</header>
				<div className="border-b border-border-secondary bg-primary text-typography-invert font-medium">
					<p className={cn(pageWidth, "flex items-start gap-2 py-2.5")}>
						<Icon name="info" className="mt-0.5 opacity-80" />
						<span>
							{demoTeam.name} is a sample team. Every check reads live Sepolia,
							and nothing here touches your pins. Your wallet is only used if
							you press Try wallet transaction.
						</span>
					</p>
				</div>
				<div className="border-b border-border-secondary">
					<nav aria-label="Demo" className={cn(pageWidth, "flex gap-6")}>
						{tabs.map((tab) => (
							<NavLink
								key={tab.to}
								to={tab.to}
								end={tab.end}
								className="-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent py-3 font-medium text-typography-secondary transition-colors hover:text-typography-primary aria-[current=page]:border-primary aria-[current=page]:text-typography-primary"
							>
								<Icon name={tab.icon} />
								{tab.label}
							</NavLink>
						))}
					</nav>
				</div>
				<div className={cn(pageWidth, "flex-1 py-8 sm:py-10")}>
					<Outlet />
				</div>
			</div>
		</BasePathProvider>
	);
}
