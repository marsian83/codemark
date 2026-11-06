import { formatDuration } from "@codemark/shared/check/explain";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Address, BlockLink, ExternalLink } from "../../components/Links";
import { useBasePath } from "../../lib/basePath";
import { ensExplorer } from "../../lib/ensExplorer";
import { formatDay, formatTimestamp, rpcErrorMessage } from "../../lib/format";
import {
	type KeyInfo,
	type KeyStatus,
	loadPublisher,
	loadReleases,
} from "../../lib/publisher";
import { ens } from "../../lib/rpc";
import { useTitle } from "../../lib/useTitle";
import { Badge, type Tone } from "../../ui/Badge";
import { buttonVariants } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { Spinner } from "../../ui/Spinner";
import { cn } from "../../utils/cn";

const status: Record<KeyStatus, { label: string; tone: Tone }> = {
	live: { label: "Live", tone: "success" },
	cut: { label: "Revoked", tone: "error" },
	lapsed: { label: "Expired", tone: "caution" },
};

const th =
	"px-3 py-2 text-left text-xs font-normal text-typography-tertiary first:pl-5 last:pr-5";
const td = "px-3 py-2.5 align-middle first:pl-5 last:pr-5";

function Releases({ keyInfo, now }: { keyInfo: KeyInfo; now: number }) {
	const base = useBasePath();
	const releases = useQuery({
		queryKey: ["releases", keyInfo.registry],
		queryFn: () => loadReleases(ens, keyInfo.registry),
		retry: false,
	});
	if (releases.isPending)
		return (
			<p className="flex items-center gap-2 px-5 py-4 text-sm text-typography-tertiary">
				<Spinner /> Reading releases from Arkiv…
			</p>
		);
	if (releases.isError)
		return (
			<p className="px-5 py-4 text-sm text-typography-secondary">
				Couldn't load the release list. {rpcErrorMessage(releases.error)} The
				key's status above comes from ENS and is still accurate.
			</p>
		);
	const { rows, rejected } = releases.data;
	return (
		<>
			{rows.length === 0 ? (
				<p className="px-5 py-4 text-sm text-typography-secondary">
					The Arkiv index lists no releases under this key. A release can still
					exist in ENS, so check its address to be sure.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border-secondary">
								<th className={th}>Release</th>
								<th className={th}>Version</th>
								<th className={th}>Released</th>
								<th className={th}>
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-secondary">
							{rows.map((r) => {
								const label = r.name.split(".")[0] ?? r.name;
								const address = r.artifact.startsWith("eip155:")
									? r.artifact.split(":")[2]
									: undefined;
								return (
									<tr key={r.name}>
										<td className={td}>
											<a
												href={ensExplorer.name(r.name)}
												target="_blank"
												rel="noreferrer"
												title={r.name}
												className="tabular underline decoration-border-primary underline-offset-4 hover:decoration-typography-tertiary"
											>
												{label}
											</a>
										</td>
										<td className={cn(td, "tabular tabular")}>{r.version}</td>
										<td className={cn(td, "whitespace-nowrap")}>
											{r.registeredAt ? (
												<span title={formatTimestamp(r.registeredAt)}>
													{formatDuration(now - r.registeredAt)} ago
												</span>
											) : (
												<span className="text-typography-tertiary">
													Block <BlockLink block={r.regBlock} />
												</span>
											)}
										</td>
										<td className={cn(td, "text-right")}>
											{address ? (
												<Link
													to={`${base}?a=${address}&role=call`}
													className={buttonVariants({
														variant: "secondary",
														size: "xs",
													})}
												>
													Check
												</Link>
											) : (
												<span className="text-xs text-typography-tertiary">
													Website
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
			{rejected > 0 ? (
				<p className="border-t border-border-secondary px-5 py-3 text-xs text-typography-tertiary">
					{rejected} index {rejected === 1 ? "entry" : "entries"} hidden because
					the key didn't sign {rejected === 1 ? "it" : "them"}.
				</p>
			) : null}
		</>
	);
}

function KeyCard({ keyInfo, now }: { keyInfo: KeyInfo; now: number }) {
	const s = status[keyInfo.status];
	return (
		<Card className="overflow-hidden">
			<header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-secondary px-5 py-4">
				<div className="flex items-center gap-2.5">
					<Icon name="key" className="text-typography-tertiary" />
					<span
						className={cn(
							"tabular font-medium",
							keyInfo.status === "cut" && "line-through",
						)}
					>
						{keyInfo.label}
					</span>
					<Badge tone={s.tone}>{s.label}</Badge>
				</div>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-typography-tertiary">
					{keyInfo.status !== "cut" ? (
						<span className="inline-flex items-center gap-1">
							Registry
							<Address value={keyInfo.registry} short />
						</span>
					) : null}
					{keyInfo.expiry ? (
						<span>
							{keyInfo.expiry > now ? "Expires" : "Expired"}{" "}
							{formatDay(keyInfo.expiry)}
						</span>
					) : null}
				</div>
			</header>
			{keyInfo.status === "cut" ? (
				<div className="px-5 py-4">
					<Callout tone="error">
						The publisher revoked this key. Every release under it now checks as
						key revoked, and the check page shows the reason.
					</Callout>
				</div>
			) : (
				<Releases keyInfo={keyInfo} now={now} />
			)}
		</Card>
	);
}

export default function PublisherPage() {
	const { publisher = "" } = useParams();
	useTitle(publisher);
	const view = useQuery({
		queryKey: ["publisher", publisher],
		queryFn: () => loadPublisher(ens, publisher),
	});
	const data = view.data;
	const live = data?.keys.filter((k) => k.status === "live").length ?? 0;
	const base = useBasePath();

	return (
		<main className="flex flex-col gap-8">
			<header className="flex flex-col gap-3">
				<Link
					to={base}
					className="inline-flex w-fit items-center gap-1 text-sm text-typography-tertiary transition-colors duration-150 hover:text-typography-primary"
				>
					<Icon name="arrow-right" className="rotate-180" />
					{base === "/demo" ? "Back to the demo" : "Check a contract"}
				</Link>
				<div className="flex flex-col gap-1">
					<span className="text-xs text-typography-tertiary">Publisher</span>
					<h1 className="break-all text-2xl font-semibold tracking-tight">
						{publisher}
					</h1>
				</div>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-typography-secondary">
					{data ? (
						<span>
							{data.keys.length} {data.keys.length === 1 ? "key" : "keys"},{" "}
							{live} live
						</span>
					) : null}
					{data?.pubRegistry ? (
						<span className="inline-flex items-center gap-1">
							Registry
							<Address value={data.pubRegistry} short />
						</span>
					) : null}
					<ExternalLink href={ensExplorer.roles(publisher)}>
						Roles on ENS explorer
					</ExternalLink>
				</div>
			</header>

			{view.isPending ? (
				<p className="flex items-center gap-2 text-sm text-typography-tertiary">
					<Spinner /> Reading {publisher} from Sepolia…
				</p>
			) : null}
			{view.isError ? (
				<Callout tone="error">
					Couldn't read {publisher}. {rpcErrorMessage(view.error)}
				</Callout>
			) : null}
			{data && !data.pubRegistry ? (
				<Callout>
					{publisher} has no ENSv2 registry on Sepolia, so it hasn't released
					anything.
				</Callout>
			) : null}
			{data?.pubRegistry && !data.keysRecordFound ? (
				<Callout tone="warning">
					{publisher} doesn't list any release keys, so every release under it
					checks as key revoked.
				</Callout>
			) : null}

			{data && data.keys.length > 0 ? (
				<section className="flex flex-col gap-4">
					<h2 className="text-base font-semibold">Release keys</h2>
					{data.keys.map((k) => (
						<KeyCard key={k.label} keyInfo={k} now={data.now} />
					))}
				</section>
			) : null}

			{data ? (
				<p className="text-xs text-typography-tertiary">
					Read at Sepolia block <BlockLink block={data.block} />,{" "}
					{formatTimestamp(data.now)}. Releases come from the Arkiv index. Check
					one to verify it against ENS.
				</p>
			) : null}
		</main>
	);
}
