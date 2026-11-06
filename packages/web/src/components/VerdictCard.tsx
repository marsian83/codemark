import type { PublisherVerdict, TargetResult } from "@codemark/shared/check";
import type { Severity, Verdict } from "@codemark/shared/verdict";
import { ensExplorer } from "../lib/ensExplorer";
import { formatDuration } from "../lib/format";
import { Address, BlockLink, EnsLink, EnsName } from "./Links";

const severityBar: Record<Severity, string> = {
	info: "border-l-emerald-600",
	amber: "border-l-amber-500",
	warning: "border-l-orange-600",
	critical: "border-l-red-600",
};

const severityText: Record<Severity, string> = {
	info: "text-emerald-700 dark:text-emerald-400",
	amber: "text-amber-700 dark:text-amber-400",
	warning: "text-orange-700 dark:text-orange-400",
	critical: "text-red-700 dark:text-red-400",
};

const verdictStyle: Record<Verdict, string> = {
	VERIFIED:
		"bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
	"VERIFIED-unproven":
		"bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300",
	"KEY REVOKED": "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300",
	PULLED: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300",
	MISMATCH: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300",
	UNKNOWN: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
	return (
		<span
			className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-xs font-semibold ${verdictStyle[verdict]}`}
		>
			{verdict}
		</span>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-w-0">
			<dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
			<dd className="break-words font-mono text-sm">{children}</dd>
		</div>
	);
}

function PublisherRow({
	v,
	external,
}: {
	v: PublisherVerdict;
	external: boolean;
}) {
	const proven =
		v.verdict === "VERIFIED"
			? "proven"
			: v.verdict === "VERIFIED-unproven"
				? "unproven"
				: undefined;
	return (
		<li className="border-t border-zinc-200 py-3 dark:border-zinc-800">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<VerdictBadge verdict={v.verdict} />
				<span className="text-sm font-semibold">
					<EnsName name={v.publisher} roles external={external} />
				</span>
				<span className="text-xs text-zinc-500 dark:text-zinc-400">
					{v.pinned ? "pinned by you" : "not pinned"}
					{v.source === "index" ? " · found via Arkiv index" : ""}
				</span>
			</div>
			{v.reason ? <p className="mt-1.5 text-sm">{v.reason}</p> : null}
			{v.release || v.key ? (
				<dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
					{v.release ? (
						<Field label="Release">
							{v.release.name}
							{external ? (
								<EnsLink href={ensExplorer.name(v.release.name)} />
							) : null}
							{v.release.forwardName ? (
								<span className="block text-xs text-zinc-500 dark:text-zinc-400">
									{v.release.forwardName}
								</span>
							) : null}
						</Field>
					) : null}
					{v.key ? <Field label="Key">{v.key}</Field> : null}
					{v.release ? (
						<>
							<Field label="Version">
								{v.release.component} {v.release.version} ({v.release.kind})
							</Field>
							<Field label="Age">
								{v.release.ageSeconds !== undefined
									? formatDuration(v.release.ageSeconds)
									: "not known"}
							</Field>
							<Field label="Immutability">{proven ?? "not applicable"}</Field>
							<Field label="Resolver">
								<Address
									value={v.release.resolver}
									short
									external={external}
									ens="resolver"
								/>
							</Field>
						</>
					) : null}
				</dl>
			) : null}
		</li>
	);
}

export function VerdictCard({
	result,
	external = true,
}: {
	result: TargetResult;
	external?: boolean;
}) {
	const { target } = result;
	return (
		<article
			className={`rounded border border-zinc-200 border-l-4 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 ${severityBar[result.severity]}`}
		>
			<header>
				<p
					className={`text-xs font-semibold uppercase tracking-wide ${severityText[result.severity]}`}
				>
					{result.severity}
				</p>
				<h3 className="mt-0.5 text-base font-semibold">{result.headline}</h3>
				<p className="mt-1 break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
					<Address value={target.address} external={external} /> · {target.role}{" "}
					· {target.via} · chain {target.chainId}
				</p>
			</header>
			{result.verdicts.length > 0 ? (
				<ul className="mt-3">
					{result.verdicts.map((v) => (
						<PublisherRow
							key={`${v.publisher}-${v.key ?? ""}`}
							v={v}
							external={external}
						/>
					))}
				</ul>
			) : (
				<p className="mt-3 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
					No publisher has released this address.
				</p>
			)}
			{result.error ? (
				<p className="border-t border-zinc-200 pt-3 text-sm text-red-700 dark:border-zinc-800 dark:text-red-400">
					This target could not be checked: {result.error}
				</p>
			) : null}
			{result.indexUnavailable ? (
				<p className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
					The Arkiv index could not be reached; only pinned publishers were
					checked.
				</p>
			) : null}
			{result.indexIncomplete ? (
				<p className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
					The Arkiv index answered only in part; other publishers may exist.
				</p>
			) : null}
			{result.indexFlooded ? (
				<p className="border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
					The Arkiv index returned too many candidates for this address; only
					pinned publishers are shown.
				</p>
			) : null}
			<footer className="border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
				Read at block <BlockLink block={result.block} external={external} /> ·
				artifact <span className="break-all font-mono">{result.artifact}</span>
			</footer>
		</article>
	);
}
