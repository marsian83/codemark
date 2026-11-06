import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { config } from "../../lib/config";
import { useTitle } from "../../lib/useTitle";
import { actionVariants } from "./Action";
import { Audiences } from "./sections/Audiences";
import { Check } from "./sections/Check";
import { Closing } from "./sections/Closing";
import { Cut } from "./sections/Cut";
import { Foundations } from "./sections/Foundations";
import { Hero } from "./sections/Hero";
import { Keys } from "./sections/Keys";
import { Limits } from "./sections/Limits";
import { Problem } from "./sections/Problem";
import { useSectionKeys } from "./useSectionKeys";
import { World } from "./world/World";

function useDarkTheme() {
	useLayoutEffect(() => {
		const root = document.documentElement;
		const previous = root.dataset.theme;
		root.dataset.theme = "dark";
		return () => {
			if (previous) root.dataset.theme = previous;
			else delete root.dataset.theme;
		};
	}, []);
}

export default function LandingPage() {
	useDarkTheme();
	useTitle("");
	useSectionKeys();
	return (
		<div className="relative isolate min-h-dvh overflow-x-clip bg-night font-text text-sand text-pretty antialiased selection:bg-fox selection:text-night">
			<World />
			<header className="fixed inset-x-0 top-0 z-20">
				<div
					className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night via-night/90 to-transparent"
					aria-hidden
				/>
				<div className="relative mx-auto flex h-20 max-w-[84rem] items-center justify-between gap-4 px-5 sm:px-10">
					<Link to="/">
						<Logo className="text-2xl" />
					</Link>
					<nav className="flex items-center gap-6 text-sm font-medium">
						<Link to="/app/docs" className="hover:text-fox max-sm:hidden">
							Docs
						</Link>
						<a
							href={config.repoUrl}
							target="_blank"
							rel="noreferrer"
							className="hover:text-fox max-sm:hidden"
						>
							GitHub
						</a>
						<Link
							to="/app"
							className={actionVariants({ tone: "sand", size: "sm" })}
						>
							Check a contract
						</Link>
					</nav>
				</div>
			</header>
			<main>
				<Hero />
				<Problem />
				<Check />
				<Cut />
				<Keys />
				<Audiences />
				<Foundations />
				<Limits />
			</main>
			<Closing />
		</div>
	);
}
