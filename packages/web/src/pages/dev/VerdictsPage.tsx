import { VerdictCard } from "../../components/VerdictCard";
import { sampleResults } from "../../lib/samples";

export default function VerdictsPage() {
	return (
		<main className="flex max-w-3xl flex-col gap-8">
			<h1 className="text-2xl font-medium tracking-tight">
				Verdict states, sample data
			</h1>
			{sampleResults.map(({ title, result }) => (
				<section key={title} className="flex flex-col gap-2">
					<h2 className="font-mono text-xs text-typography-tertiary">
						{title}
					</h2>
					<VerdictCard result={result} external={false} />
				</section>
			))}
		</main>
	);
}
