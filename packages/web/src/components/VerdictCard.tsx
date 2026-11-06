import type { PublisherVerdict, TargetResult } from "@codemark/shared/check";
import {
	explain,
	notices,
	roleLabel,
	severityLabel,
	verdictLabel,
} from "@codemark/shared/check/explain";
import type { Thresholds } from "@codemark/shared/check/severity";
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

const look: Record<Severity, { icon: IconName; mark: string; text: string }> = {
	info: { icon: "check", mark: "bg-success/15", text: "text-success" },
	amber: { icon: "clock", mark: "bg-caution/15", text: "text-caution" },
	warning: {
		icon: "alert-triangle",
		mark: "bg-warning/15",
		text: "text-warning",
	},
	critical: { icon: "close", mark: "bg-error/15", text: "text-error" },
};

function PublisherHeader({ verdict }: { verdict: PublisherVerdict }) {
	return (
		<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<PublisherLink name={verdict.publisher} />
			<Badge tone={verdictTone[verdict.verdict]}>
				{verdictLabel[verdict.verdict]}
			</Badge>
			<span className="text-sm text-typography-tertiary">
				{verdict.pinned ? "Pinned" : "Not pinned"}
			</span>
		</span>
	);
}

function PublisherBody({
	verdict,
	result,
	thresholds,
}: {
	verdict: PublisherVerdict;
	result: TargetResult;
	thresholds: Thresholds;
}) {
	const hasPath =
		verdict.key || verdict.release || verdict.verdict !== "UNKNOWN";
	const repin =
		verdict.pinned &&
		verdict.verdict === "MISMATCH" &&
		!verdict.key &&
		!verdict.checkFailed;
	return (
		<>
			{hasPath ? (
				<TrustPath
					verdict={verdict}
					role={result.target.role}
					thresholds={thresholds}
				/>
			) : verdict.reason ? (
				<p className="text-typography-secondary">{verdict.reason}</p>
			) : null}
			{repin ? <RepinPrompt name={verdict.publisher} /> : null}
		</>
	);
}

function Publishers({
	result,
	thresholds,
}: {
	result: TargetResult;
	thresholds: Thresholds;
}) {
	const single = result.verdicts.length === 1;
	const anyPinned = result.verdicts.some((v) => v.pinned);
	const ordered = [...result.verdicts].sort(
		(a, b) => Number(b.pinned) - Number(a.pinned),
	);
	return (
		<>
			{ordered.map((v, i) => {
				const key = `${v.publisher}-${v.key ?? ""}`;
				const body = (
					<PublisherBody verdict={v} result={result} thresholds={thresholds} />
				);
				if (single)
					return (
						<section
							key={key}
							className="flex flex-col gap-4 border-t border-border-secondary p-5"
						>
							{body}
						</section>
					);
				return (
					<details
						key={key}
						open={anyPinned ? v.pinned : i === 0}
						className="group/publisher border-t border-border-secondary"
					>
						<summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-background-raised [&::-webkit-details-marker]:hidden">
							<Icon
								name="chevron-down"
								className="-rotate-90 text-typography-tertiary transition-transform duration-150 group-open/publisher:rotate-0"
							/>
							<PublisherHeader verdict={v} />
						</summary>
						<div className="flex flex-col gap-4 px-5 pb-5">{body}</div>
					</details>
				);
			})}
		</>
	);
}

function Notices({ result }: { result: TargetResult }) {
	const list = notices(result);
	if (list.length === 0) return null;
	return (
		<div className="flex flex-col gap-2 border-t border-border-secondary p-5">
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
				className="shrink-0 text-sm text-typography-tertiary sm:w-36"
				title={hint}
			>
				{label}
			</dt>
			<dd className="min-w-0 break-all tabular text-xs text-typography-secondary">
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
		<details className="group/details border-t border-border-secondary">
			<summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 font-medium text-typography-secondary transition-colors hover:bg-background-raised hover:text-typography-primary [&::-webkit-details-marker]:hidden">
				<Icon
					name="chevron-down"
					className="-rotate-90 text-typography-tertiary transition-transform duration-150 group-open/details:rotate-0"
				/>
				Show technical details
			</summary>
			<dl className="flex flex-col gap-3 px-5 pb-5">
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
							className="flex flex-col gap-3"
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
	thresholds = config.thresholds,
}: {
	result: TargetResult;
	external?: boolean;
	thresholds?: Thresholds;
}) {
	const { title, body } = explain(result, thresholds);
	const l = look[result.severity];
	return (
		<Card className="motion-safe:animate-rise">
			<header className="flex items-start gap-3 p-5">
				<span
					className={cn(
						"flex-center size-9 shrink-0 rounded-lg",
						l.mark,
						l.text,
					)}
				>
					<Icon name={l.icon} className="size-5" />
				</span>
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
						<p className={cn("text-lg leading-7 font-semibold", l.text)}>
							{severityLabel[result.severity]}
						</p>
						<Badge>{roleLabel[result.target.role]}</Badge>
					</div>
					<h2 className="font-medium text-balance">{title}</h2>
					{body ? (
						<p className="max-w-2xl text-pretty text-typography-secondary">
							{body}
						</p>
					) : null}
					<Address
						value={result.target.address}
						external={external}
						className="mt-1 text-xs text-typography-secondary"
					/>
				</div>
			</header>
			<Publishers result={result} thresholds={thresholds} />
			<Notices result={result} />
			<Details result={result} external={external} />
		</Card>
	);
}
