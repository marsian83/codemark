import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Address, BlockLink, EnsLink } from "../../components/Links";
import { ensFor } from "../../lib/checker";
import { ensExplorer } from "../../lib/ensExplorer";
import {
	formatDuration,
	formatTimestamp,
	rpcErrorMessage,
} from "../../lib/format";
import { type KeyInfo, loadPublisher, loadReleases } from "../../lib/publisher";
import { useTitle } from "../../lib/useTitle";

const statusStyle = {
	live: "text-emerald-700 dark:text-emerald-400",
	cut: "text-red-700 dark:text-red-400",
	lapsed: "text-orange-700 dark:text-orange-400",
};

const statusText = {
	live: "live",
	cut: "cut",
	lapsed: "lapsed",
};

const th = "py-1 pr-3 text-left text-xs font-normal text-zinc-500";
const td = "py-1.5 pr-3 align-top";

function KeyTable({ keys }: { keys: KeyInfo[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr>
						<th className={th}>Key</th>
						<th className={th}>Registry</th>
						<th className={th}>Status</th>
						<th className={th}>Key expiry</th>
					</tr>
				</thead>
				<tbody>
					{keys.map((k) => (
						<tr
							key={k.label}
							className="border-t border-zinc-200 dark:border-zinc-800"
						>
							<td
								className={`${td} font-mono ${k.status === "cut" ? "line-through" : ""}`}
							>
								{k.label}
							</td>
							<td className={`${td} text-xs`}>
								{k.status === "cut" ? (
									"unmounted"
								) : (
									<Address value={k.registry} short ens="registry" />
								)}
							</td>
							<td className={`${td} font-semibold ${statusStyle[k.status]}`}>
								{statusText[k.status]}
							</td>
							<td className={`${td} font-mono text-xs`}>
								{k.expiry ? formatTimestamp(k.expiry) : "not read"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function KeyReleases({ keyInfo, now }: { keyInfo: KeyInfo; now: number }) {
	const releases = useQuery({
		queryKey: ["releases", keyInfo.registry],
		queryFn: () => loadReleases(ensFor("sepolia"), keyInfo.registry),
		retry: false,
	});
	if (releases.isPending) return <p className="text-sm">Reading Arkiv…</p>;
	if (releases.isError) {
		return (
			<p className="text-sm text-zinc-600 dark:text-zinc-400">
				Release list unavailable: {rpcErrorMessage(releases.error)}. Key status
				above is read from ENS and is unaffected.
			</p>
		);
	}
	const { rows, rejected } = releases.data;
	return (
		<div className="space-y-1">
			{rows.length === 0 ? (
				<p className="text-sm">No release rows in Arkiv for this key.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr>
								<th className={th}>Release</th>
								<th className={th}>Version</th>
								<th className={th}>Kind</th>
								<th className={th}>Age</th>
								<th className={th}>Registered at block</th>
								<th className={th} />
							</tr>
						</thead>
						<tbody>
							{rows.map((r) => (
								<tr
									key={r.name}
									className="border-t border-zinc-200 dark:border-zinc-800"
								>
									<td className={`${td} break-all font-mono text-xs`}>
										{r.name}
										<EnsLink href={ensExplorer.name(r.name)} />
									</td>
									<td className={`${td} font-mono`}>{r.version}</td>
									<td className={td}>{r.kind}</td>
									<td className={td}>
										{r.registeredAt
											? formatDuration(now - r.registeredAt)
											: "not read"}
									</td>
									<td className={`${td} font-mono text-xs`}>
										<BlockLink block={r.regBlock} />
									</td>
									<td className={td}>
										{r.artifact.startsWith("eip155:") ? (
											<Link
												className="underline underline-offset-2"
												to={`/?a=${r.artifact.split(":")[2]}&role=call`}
											>
												check
											</Link>
										) : (
											<span className="text-xs text-zinc-500">web</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{rejected > 0 ? (
				<p className="text-xs text-zinc-500 dark:text-zinc-400">
					{rejected} Arkiv row{rejected === 1 ? "" : "s"} hidden: not created by
					a key holding the registrar role, or malformed.
				</p>
			) : null}
		</div>
	);
}

export default function PublisherPage() {
	const { publisher = "" } = useParams();
	useTitle(publisher);
	const view = useQuery({
		queryKey: ["publisher", publisher],
		queryFn: () => loadPublisher(ensFor("sepolia"), publisher),
	});

	return (
		<main className="space-y-6 pt-6">
			<header>
				<h1 className="break-all font-mono text-lg font-semibold">
					{publisher}
				</h1>
				<p className="mt-1 text-xs">
					<EnsLink
						href={ensExplorer.roles(publisher)}
						label="roles on ENS explorer"
					/>
					<EnsLink
						href={ensExplorer.name(publisher)}
						label="name on ENS explorer"
					/>
				</p>
				{view.data ? (
					<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
						Sepolia block <BlockLink block={view.data.block} /> at{" "}
						{formatTimestamp(view.data.now)}
						{view.data.pubRegistry ? (
							<>
								{" "}
								· PubRegistry{" "}
								<Address value={view.data.pubRegistry} short ens="registry" />
							</>
						) : null}
					</p>
				) : null}
			</header>
			{view.isPending ? <p className="text-sm">Reading Sepolia…</p> : null}
			{view.isError ? (
				<p role="alert" className="text-sm text-red-700 dark:text-red-400">
					Could not read {publisher}. {rpcErrorMessage(view.error)}
				</p>
			) : null}
			{view.data && !view.data.pubRegistry ? (
				<p className="text-sm">
					{publisher} has no registry on Sepolia, so it has not published
					anything.
				</p>
			) : null}
			{view.data?.pubRegistry && !view.data.keysRecordFound ? (
				<p className="text-sm">
					{publisher} has no codemark.keys record. Without it no key is listed
					and every release resolves as KEY REVOKED.
				</p>
			) : null}
			{view.data && view.data.keys.length > 0 ? (
				<section className="space-y-2">
					<h2 className="text-sm font-semibold">Keys</h2>
					<KeyTable keys={view.data.keys} />
				</section>
			) : null}
			{view.data?.keys.map((k) => (
				<section key={k.label} className="space-y-2">
					<h2 className="font-mono text-base font-semibold">
						<span className={k.status === "cut" ? "line-through" : ""}>
							{k.label}
						</span>{" "}
						<span className={`font-sans text-sm ${statusStyle[k.status]}`}>
							{statusText[k.status]}
						</span>
					</h2>
					{k.status === "cut" ? (
						<p className="text-sm">
							The registry is no longer mounted, so every release under this key
							is KEY REVOKED. The reason is shown on the check page for a
							release address.
						</p>
					) : (
						<KeyReleases keyInfo={k} now={view.data.now} />
					)}
				</section>
			))}
			<p className="text-xs text-zinc-500 dark:text-zinc-400">
				Release rows are unverified claims from the Arkiv index. Use check on a
				row to verify it against ENS.
			</p>
		</main>
	);
}
