import { Link } from "react-router-dom";
import { SiteHeaderRow } from "../../components/SiteHeader";
import { config } from "../../lib/config";
import { useTitle } from "../../lib/useTitle";
import { actionVariants } from "../../ui/action";
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

export default function LandingPage() {
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
				<SiteHeaderRow
					tone="landing"
					links={[
						{ label: "Demo", to: "/demo", desktopOnly: true },
						{ label: "Docs", to: "/app/docs", desktopOnly: true },
						{ label: "GitHub", href: config.repoUrl, desktopOnly: true },
					]}
					action={
						<Link
							to="/app"
							className={actionVariants({ tone: "sand", size: "sm" })}
						>
							Check a contract
						</Link>
					}
				/>
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
