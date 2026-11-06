import type { PublisherVerdict, TargetResult } from "@codemark/shared/check";
import {
	explain,
	notices,
	roleLabel,
	severityLabel,
	verdictLabel,
} from "@codemark/shared/check/explain";
import type { Severity } from "@codemark/shared/verdict";
import type { ReactNode } from "react";
import { config } from "../lib/config";
import { ensExplorer } from "../lib/ensExplorer";
import { verdictTone } from "../lib/tones";
import { Badge } from "../ui/Badge";
import { Callout } from "../ui/Callout";
import { Card } from "../ui/Card";
import { Icon, type IconName } from "../ui/Icon";
import { cn } from "../utils/cn";
import { Address, BlockLink, ExternalLink, PublisherLink } from "./Links";
import { RepinPrompt } from "./RepinPrompt";
import { TrustPath } from "./TrustPath";

const look: Record<
	Severity,
	{ icon: IconName; edge: string; mark: string; text: string }
> = {
	info: {
		icon: "check",
		edge: "border-t-success",
		mark: "bg-success",
		text: "text-success",
	},
	amber: {
		icon: "clock",
		edge: "border-t-caution",
		mark: "bg-caution",
		text: "text-caution",
	},
	warning: {
		icon: "alert-triangle",
		edge: "border-t-warning",
		mark: "bg-warning",
		text: "text-warning",
	},
	critical: {
		icon: "close",
		edge: "border-t-error",
		mark: "bg-error",
		text: "text-error",
	},
};

function Publisher({
	verdict,
	result,
	single,
}: {
	verdict: PublisherVerdict;
	result: TargetResult;
	single: boolean;
}) {
	const hasPath =
		verdict.key || verdict.release || verdict.verdict !== "UNKNOWN";
	const repin =
		verdict.pinned &&
		verdict.verdict === "MISMATCH" &&
		!verdict.key &&
		!verdict.checkFailed;
	return (
		<section className="flex flex-col gap-4 border-t border-border-secondary px-5 py-5 sm:px-6">
			{single ? null : (
				<header className="flex flex-wrap items-center gap-2">
					<PublisherLink name={verdict.publisher} />
					<Badge tone={verdictTone[verdict.verdict]}>
						{verdictLabel[verdict.verdict]}
					</Badge>
					<span className="text-sm text-typography-secondary">
						{verdict.pinned ? "Pinned" : "Not pinned"}
					</span>
				</header>
			)}
			{hasPath ? (
				<TrustPath verdict={verdict} role={result.target.role} />
			) : verdict.reason ? (
				<p className="text-sm text-typography-secondary">{verdict.reason}</p>
			) : null}
			{repin ? <RepinPrompt name={verdict.publisher} /> : null}
		</section>
	);
}

function Notices({ result }: { result: TargetResult }) {
	const list = notices(result);
	if (list.length === 0) return null;
	return (
		<div className="flex flex-col gap-2 border-t border-border-secondary px-5 py-4 sm:px-6">
			{list.map((n) => (
				<Callout key={n.text} tone={n.tone}>
					{n.text}
				</Callout>
			))}
		</div>
	);
}

function Detail({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:gap-4">
			<dt
				className="shrink-0 text-sm text-typography-secondary sm:w-36"
				title={hint}
			>
				{label}
			</dt>
			<dd className="min-w-0 break-all font-mono text-xs text-typography-secondary sm:pt-0.5">
				{children}
			</dd>
		</div>
	);
}

function Details({
	result,
	external,
}: {
	result: TargetResult;
	external: boolean;
}) {
	return (
		<details className="group border-t border-border-secondary">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-5 py-3 text-sm text-typography-secondary transition-colors duration-150 hover:text-typography-primary sm:px-6 [&::-webkit-details-marker]:hidden">
				<Icon
					name="chevron-down"
					className="-rotate-90 transition-transform duration-200 group-open:rotate-0"
				/>
				Show technical details
			</summary>
			<dl className="flex flex-col gap-2.5 px-5 pb-5 sm:px-6">
				<Detail label="Summary">{result.headline}</Detail>
				<Detail
					label="Artifact"
					hint="The chain and address this check is about"
				>
					{result.artifact}
				</Detail>
				<Detail label="Read at block">
					<BlockLink block={result.block} external={external} />
				</Detail>
				{result.verdicts.map((v) =>
					v.release ? (
						<div
							key={`${v.publisher}-${v.key ?? ""}`}
							className="flex flex-col gap-2.5"
						>
							<Detail label="Release" hint="The ENS name of this release">
								{external ? (
									<ExternalLink href={ensExplorer.name(v.release.name)}>
										{v.release.name}
									</ExternalLink>
								) : (
									v.release.name
								)}
							</Detail>
							{v.release.forwardName ? (
								<Detail
									label="Lookup name"
									hint="The name derived from the address, used to find the release"
								>
									{v.release.forwardName}
								</Detail>
							) : null}
							<Detail
								label="Resolver"
								hint="The contract that stores this release's record"
							>
								<Address value={v.release.resolver} external={external} />
							</Detail>
							<Detail
								label="Code hash"
								hint="A fingerprint of the released code"
							>
								{v.release.codeHash}
							</Detail>
							{v.release.implementation ? (
								<Detail
									label="Implementation"
									hint="The code behind this proxy"
								>
									<Address
										value={v.release.implementation}
										external={external}
									/>
								</Detail>
							) : null}
							{v.release.regBlock !== undefined ? (
								<Detail label="Released at block">
									<BlockLink block={v.release.regBlock} external={external} />
								</Detail>
							) : null}
						</div>
					) : null,
				)}
			</dl>
		</details>
	);
}

export function VerdictCard({
	result,
	external = true,
}: {
	result: TargetResult;
	external?: boolean;
}) {
	const { title, body } = explain(result, config.thresholds);
	const l = look[result.severity];
	const single = result.verdicts.length === 1;
	return (
		<Card
			className={cn(
				"overflow-hidden border-t-4 motion-safe:animate-rise",
				l.edge,
			)}
		>
			<header className="flex flex-col gap-3 px-5 pt-5 pb-5 sm:px-6">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					<span
						className={cn(
							"flex-center size-8 shrink-0 rounded-full text-typography-invert",
							l.mark,
						)}
					>
						<Icon name={l.icon} className="size-4.5" />
					</span>
					<p className={cn("text-2xl font-semibold tracking-tight", l.text)}>
						{severityLabel[result.severity]}
					</p>
					<Badge tone="neutral" className="text-sm">
						{roleLabel[result.target.role]}
					</Badge>
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<h2 className="text-base font-medium leading-snug text-balance">
						{title}
					</h2>
					{body ? (
						<p className="text-sm text-typography-secondary text-pretty">
							{body}
						</p>
					) : null}
				</div>
				<Address
					value={result.target.address}
					external={external}
					className="text-xs text-typography-secondary"
				/>
			</header>
			{result.verdicts.map((v) => (
				<Publisher
					key={`${v.publisher}-${v.key ?? ""}`}
					verdict={v}
					result={result}
					single={single}
				/>
			))}
			<Notices result={result} />
			<Details result={result} external={external} />
		</Card>
	);
}
