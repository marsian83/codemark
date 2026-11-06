import { contractArtifact } from "@codemark/shared";
import type { TargetRole } from "@codemark/shared/check";
import { roleLabel } from "@codemark/shared/check/explain";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import HowItWorks from "../../components/HowItWorks";
import { BlockLink } from "../../components/Links";
import PinsEditor from "../../components/PinsEditor";
import SnapPanel from "../../components/SnapPanel";
import { VerdictCard } from "../../components/VerdictCard";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import { examples } from "../../lib/examples";
import { formatTimestamp, rpcErrorMessage } from "../../lib/format";
import { usePins } from "../../lib/pins";
import { useTitle } from "../../lib/useTitle";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { fieldClass, Input } from "../../ui/Input";
import { Spinner } from "../../ui/Spinner";
import { cn } from "../../utils/cn";

const roles: TargetRole[] = [
	"call",
	"delegation",
	"delegatecall",
	"approval-spender",
];

function Pending() {
	return (
		<Card className="flex items-start gap-3 px-5 py-5 sm:px-6">
			<Spinner className="mt-0.5 text-typography-tertiary" />
			<div className="flex flex-col gap-1">
				<p className="font-medium">Checking on Sepolia</p>
				<p className="text-sm text-typography-secondary">
					Finding the release, checking its record can't be changed and its key
					is still active. This takes a few seconds.
				</p>
			</div>
		</Card>
	);
}

export default function LookupPage() {
	useTitle("Check a contract");
	const [params, setParams] = useSearchParams();
	const { pins } = usePins();
	const resultRef = useRef<HTMLElement>(null);
	const address = params.get("a") ?? "";
	const roleParam = params.get("role");
	const role: TargetRole =
		(Object.keys(roleLabel) as TargetRole[]).find((r) => r === roleParam) ??
		"call";
	const [draft, setDraft] = useState(address);
	const [draftRole, setDraftRole] = useState<TargetRole>(role);
	const [draftError, setDraftError] = useState("");

	const query = useQuery({
		queryKey: ["check", address, role, pins],
		enabled: isAddress(address),
		queryFn: () =>
			runCheck(
				[
					{
						address: address as `0x${string}`,
						chainId: config.chainId,
						role,
						via: "lookup",
					},
				],
				pins,
			),
	});

	function go(value: `0x${string}`, nextRole: TargetRole) {
		setParams({
			a: contractArtifact(config.chainId, value).split(":")[2] ?? value,
			role: nextRole,
		});
	}

	function submit(event: FormEvent) {
		event.preventDefault();
		const value = draft.trim();
		if (!isAddress(value)) {
			setDraftError(
				"Enter a contract address that starts with 0x and has 40 hex characters.",
			);
			return;
		}
		setDraftError("");
		go(value, draftRole);
	}

	const checking = isAddress(address) && query.isPending;
	const done = query.isSuccess;

	useEffect(() => {
		if (done)
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [done]);

	return (
		<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
			<main className="flex min-w-0 flex-col gap-8">
				<section className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
							Check a contract before you sign
						</h1>
						<p className="max-w-xl text-base text-typography-secondary text-pretty">
							See which team released it through their ENS name, and whether
							they still stand behind it.
						</p>
					</div>
					<form onSubmit={submit} noValidate className="flex flex-col gap-2">
						<div className="flex flex-col gap-2 sm:flex-row">
							<div className="relative min-w-0 flex-1">
								<Icon
									name="search"
									className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-typography-tertiary"
								/>
								<Input
									className="h-11 pl-9 font-mono"
									placeholder="0x… contract address on Sepolia"
									aria-label="Contract address"
									aria-invalid={draftError ? true : undefined}
									aria-describedby={draftError ? "address-error" : undefined}
									spellCheck={false}
									autoComplete="off"
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
								/>
							</div>
							<div className="relative">
								<select
									aria-label="How the contract is used"
									className={cn(
										fieldClass,
										"h-11 w-full appearance-none pr-9 sm:w-auto",
									)}
									value={draftRole}
									onChange={(e) => setDraftRole(e.target.value as TargetRole)}
								>
									{roles.map((r) => (
										<option key={r} value={r}>
											{roleLabel[r]}
										</option>
									))}
								</select>
								<Icon
									name="chevron-down"
									className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-typography-tertiary"
								/>
							</div>
							<Button type="submit" size="lg" loading={checking}>
								Check
							</Button>
						</div>
						{draftError ? (
							<p id="address-error" role="alert" className="text-sm text-error">
								{draftError}
							</p>
						) : null}
					</form>
					<div className="flex flex-col gap-2">
						<span className="text-sm text-typography-secondary">
							Or try a demo contract
						</span>
						<div className="grid gap-2 sm:grid-cols-2">
							{examples.map((ex) => {
								const active =
									address.toLowerCase() === ex.address.toLowerCase() &&
									role === ex.role;
								return (
									<button
										key={ex.label}
										type="button"
										aria-pressed={active}
										onClick={() => {
											setDraft(ex.address);
											setDraftRole(ex.role);
											setDraftError("");
											go(ex.address, ex.role);
										}}
										className={cn(
											"group flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none",
											active
												? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
												: "border-border-secondary bg-background-container hover:border-border-primary",
										)}
									>
										<span className="flex min-w-0 flex-col">
											<span className="text-sm font-medium">{ex.label}</span>
											<span className="text-sm text-typography-secondary">
												{ex.detail}
											</span>
										</span>
										<Icon
											name="arrow-right"
											className="text-typography-tertiary transition-transform duration-150 group-hover:translate-x-0.5"
										/>
									</button>
								);
							})}
						</div>
					</div>
				</section>

				{isAddress(address) ? (
					<section
						ref={resultRef}
						aria-live="polite"
						className="flex scroll-mt-20 flex-col gap-3"
					>
						{checking ? <Pending /> : null}
						{query.isError ? (
							<Callout tone="error">
								<p className="font-medium text-typography-primary">
									Couldn't finish the check
								</p>
								<p>{rpcErrorMessage(query.error)}</p>
								<Button
									variant="secondary"
									size="sm"
									className="mt-2"
									onClick={() => query.refetch()}
								>
									<Icon name="refresh" />
									Try again
								</Button>
							</Callout>
						) : null}
						{query.data && !checking
							? query.data.result.results.map((r) => (
									<VerdictCard key={r.artifact + r.target.role} result={r} />
								))
							: null}
						{query.data && !checking ? (
							<p className="text-xs text-typography-tertiary">
								Read at Sepolia block{" "}
								<BlockLink block={query.data.result.block} />,{" "}
								{formatTimestamp(query.data.now)}.
							</p>
						) : null}
					</section>
				) : (
					<HowItWorks />
				)}
			</main>
			<aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
				<PinsEditor />
				<SnapPanel />
			</aside>
		</div>
	);
}
