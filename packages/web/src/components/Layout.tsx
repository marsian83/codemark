import { NavLink, Outlet } from "react-router-dom";
import { config } from "../lib/config";

const link = ({ isActive }: { isActive: boolean }) =>
	`py-1 ${isActive ? "font-semibold underline underline-offset-4" : "text-zinc-600 dark:text-zinc-400"}`;

export default function Layout() {
	return (
		<div className="mx-auto max-w-3xl px-4 pb-16">
			<header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-zinc-200 py-4 dark:border-zinc-800">
				<NavLink to="/" className="font-mono text-base font-bold">
					codemark
				</NavLink>
				<nav className="flex gap-5 text-sm">
					<NavLink to="/" end className={link}>
						Check
					</NavLink>
					<NavLink to="/demo-wallet" className={link}>
						Account upgrade demo
					</NavLink>
					{import.meta.env.DEV ? (
						<NavLink to="/dev/verdicts" className={link}>
							Verdicts
						</NavLink>
					) : null}
				</nav>
			</header>
			<Outlet />
			<footer className="mt-12 flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
				<span>Sepolia · ENSv2 · Arkiv Rabdi</span>
				{config.repoUrl ? (
					<a
						href={config.repoUrl}
						target="_blank"
						rel="noreferrer"
						className="underline underline-offset-2"
					>
						Source repository
					</a>
				) : null}
			</footer>
		</div>
	);
}
