import { Link, NavLink, Outlet } from "react-router-dom";
import { config } from "../lib/config";
import { Icon } from "../ui/Icon";
import { cn } from "../utils/cn";
import { Logo } from "./Logo";

const navLink = ({ isActive }: { isActive: boolean }) =>
	cn(
		"rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
		isActive
			? "bg-background-raised text-typography-primary"
			: "text-typography-secondary hover:text-typography-primary",
	);

export default function Layout() {
	return (
		<div className="flex min-h-dvh flex-col">
			<header className="sticky top-0 z-20 border-b border-border-secondary bg-background-layout">
				<div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
					<div className="flex min-w-0 items-center gap-4 sm:gap-6">
						<Link to="/" className="shrink-0 text-typography-primary">
							<Logo className="text-lg" />
						</Link>
						<nav className="flex items-center gap-1">
							<NavLink to="/app" end className={navLink}>
								Check
							</NavLink>
							<NavLink to="/app/demo-wallet" className={navLink}>
								<span className="max-sm:hidden">Account upgrade demo</span>
								<span className="sm:hidden">Demo</span>
							</NavLink>
							<NavLink to="/app/docs" className={navLink}>
								Docs
							</NavLink>
						</nav>
					</div>
					<a
						href={config.repoUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-typography-secondary transition-colors duration-150 hover:text-typography-primary"
					>
						<Icon name="github" />
						<span className="max-sm:hidden">Source</span>
					</a>
				</div>
			</header>
			<div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
				<Outlet />
			</div>
			<footer className="border-t border-border-secondary">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-5 text-xs text-typography-tertiary sm:px-8">
					<span>Checks ENS on Sepolia straight from your browser.</span>
					<span>No Codemark server sees what you check.</span>
				</div>
			</footer>
		</div>
	);
}
