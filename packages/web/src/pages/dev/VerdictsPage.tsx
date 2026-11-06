import { VerdictCard } from "../../components/VerdictCard";
import { sampleResults } from "../../lib/samples";

export default function VerdictsPage() {
	return (
		<main className="space-y-6 pt-6">
			<h1 className="text-lg font-semibold">Verdict states (sample data)</h1>
			{sampleResults.map(({ title, result }) => (
				<section key={title}>
					<h2 className="mb-2 font-mono text-xs text-zinc-500">{title}</h2>
					<VerdictCard result={result} />
				</section>
			))}
		</main>
	);
}
