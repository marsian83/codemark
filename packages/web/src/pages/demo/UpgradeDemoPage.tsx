import { formatDuration } from "@codemark/shared/check/explain";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { isAddress } from "viem";
import { CheckResult } from "../../components/CheckResult";
import { Address, BlockLink } from "../../components/Links";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import {
	demoTeam,
	demoUpgradeContracts,
	demoUpgradeThresholds,
} from "../../lib/demo";
import { errorMessage, rpcErrorMessage } from "../../lib/format";
import { useTitle } from "../../lib/useTitle";
import { account, readChainHead, signUpgrade } from "../../lib/wallet";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { Input } from "../../ui/Input";
import { Spinner } from "../../ui/Spinner";
import { cn } from "../../utils/cn";

const demoWait = formatDuration(demoUpgradeThresholds.delegateMinAgeSeconds);
const realWait = formatDuration(config.thresholds.delegateMinAgeSeconds);

function NetworkStatus() {
	const head = useQuery({
		queryKey: ["chain-head"],
		queryFn: readChainHead,
		refetchInterval: (q) => (q.state.status === "error" ? 8000 : 12000),
		retry: false,
	});
	if (head.isError)
		return (
			<p className="text-warning">
				Couldn't reach Sepolia. This page keeps trying.{" "}
				{errorMessage(head.error)}
			</p>
		);
	if (!head.data)
		return (
			<p className="flex items-center gap-2 text-typography-tertiary">
				<Spinner /> Connecting to Sepolia…
			</p>
		);
	return (
		<p className="text-typography-secondary">
			Sepolia block <BlockLink block={head.data.blockNumber} />
		</p>
	);
}

export default function UpgradeDemoPage() {
	useTitle("Account upgrade demo");
	const [draft, setDraft] = useState("");
	const [target, setTarget] = useState<`0x${string}` | undefined>();
	const [draftError, setDraftError] = useState("");

	const check = useQuery({
		queryKey: ["demo-upgrade", target],
		enabled: target !== undefined,
		queryFn: () =>
			runCheck(
				[
					{
						address: target as `0x${string}`,
						chainId: config.chainId,
						role: "delegation",
						via: "EIP-7702 authorization",
					},
				],
				[demoTeam],
				demoUpgradeThresholds,
			),
	});

	const sign = useMutation({ mutationFn: signUpgrade });

	const result = check.isFetching ? undefined : check.data?.result.results[0];
	const blocked = result?.severity === "critical";
	const unverified = result && !blocked && result.severity !== "info";

	function choose(value: string) {
		const v = value.trim();
		if (!isAddress(v)) {
			setDraftError("Address must start with 0x and have 42 characters");
			return;
		}
		setDraftError("");
		sign.reset();
		setTarget(v);
	}

	function submit(event: FormEvent) {
		event.preventDefault();
		choose(draft);
	}

	return (
		<main className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
			<div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Account upgrade
					</h1>
					<p className="text-typography-secondary">
						An EIP-7702 upgrade gives a contract full control of your account.
						This wallet checks the contract before it lets you sign.
					</p>
				</div>
				<Card className="overflow-hidden">
					<ul className="flex flex-col divide-y divide-border-secondary">
						{demoUpgradeContracts.map((c) => {
							const active = target?.toLowerCase() === c.address.toLowerCase();
							return (
								<li key={c.address}>
									<button
										type="button"
										aria-pressed={active}
										onClick={() => {
											setDraft(c.address);
											choose(c.address);
										}}
										className={cn(
											"flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
											active
												? "bg-background-raised shadow-[inset_0.125rem_0_0_var(--color-primary)]"
												: "hover:bg-background-raised",
										)}
									>
										<Icon
											name={c.icon}
											className="mt-0.5 text-typography-tertiary"
										/>
										<span className="flex min-w-0 flex-col">
											<span className="font-medium">{c.label}</span>
											<span className="text-typography-secondary">
												{c.detail}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</Card>
				<form onSubmit={submit} noValidate className="flex flex-col gap-2">
					<div className="flex gap-2">
						<Input
							className="tabular"
							placeholder="Or paste a contract, 0x…"
							aria-label="Contract to upgrade to"
							aria-invalid={draftError ? true : undefined}
							spellCheck={false}
							autoComplete="off"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
						/>
						<Button type="submit" variant="secondary">
							Check
						</Button>
					</div>
					{draftError ? (
						<p role="alert" className="text-error">
							{draftError}
						</p>
					) : null}
				</form>
				<div className="flex flex-col gap-1 border-t border-border-secondary pt-4">
					<NetworkStatus />
					<p className="flex flex-wrap items-center gap-1 text-typography-secondary">
						Throwaway account
						<Address value={account.address} short external={false} />
					</p>
					<p className="text-xs text-typography-tertiary">
						Made in this tab. The upgrade is signed but never sent, so nothing
						changes on chain.
					</p>
				</div>
			</div>

			<div aria-live="polite" className="flex min-w-0 flex-col gap-3">
				<Card className="flex flex-col gap-3 p-5">
					<h2 className="flex items-center gap-2 font-medium">
						<Icon name="key" className="text-typography-tertiary" />
						Signature
					</h2>
					{blocked ? (
						<Callout tone="error">
							This wallet won't sign it. Handing your account to this contract
							could let it take everything.
						</Callout>
					) : null}
					{unverified ? (
						<Callout tone="warning">
							Codemark couldn't verify it. You can still sign, but it isn't
							recommended.
						</Callout>
					) : null}
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<Button
							variant={result && !blocked ? "primary" : "secondary"}
							size="lg"
							className="w-fit"
							loading={sign.isPending}
							disabled={!result || blocked}
							onClick={() => target && sign.mutate(target)}
						>
							{blocked ? <Icon name="lock" /> : null}
							{sign.isPending
								? "Signing…"
								: blocked
									? "Can't sign"
									: unverified
										? "Sign anyway"
										: "Sign upgrade"}
						</Button>
						{!target ? (
							<span className="text-typography-tertiary">
								Choose a contract first
							</span>
						) : check.isFetching ? (
							<span className="inline-flex items-center gap-2 text-typography-tertiary">
								<Spinner /> Checking the contract. Signing unlocks after this.
							</span>
						) : null}
					</div>
					{sign.isError ? (
						<Callout tone="error">
							The upgrade didn't go through. {rpcErrorMessage(sign.error)}
						</Callout>
					) : null}
					{sign.data ? (
						<div className="flex flex-col gap-1">
							<p className="flex items-center gap-1.5 font-medium text-success">
								<Icon name="circle-check" />
								Upgrade signed, not sent. Your account is unchanged.
							</p>
							<p className="tabular break-all text-xs text-typography-tertiary">
								r {sign.data.r}
							</p>
							<p className="tabular break-all text-xs text-typography-tertiary">
								s {sign.data.s}
							</p>
						</div>
					) : null}
				</Card>
				{target ? (
					<CheckResult query={check} thresholds={demoUpgradeThresholds} />
				) : (
					<Card className="flex items-start gap-3 p-5">
						<Icon name="wallet" className="mt-0.5 text-typography-tertiary" />
						<div className="flex flex-col gap-1">
							<p className="font-medium">No contract chosen</p>
							<p className="text-typography-secondary">
								Choose a contract to see its check and unlock signing.
							</p>
						</div>
					</Card>
				)}
				<p className="flex items-start gap-1.5 text-xs text-typography-tertiary">
					<Icon name="clock" className="size-3.5" />
					This demo trusts a release after {demoWait}, so you can see an upgrade
					go through. Real checks wait {realWait}.
				</p>
			</div>
		</main>
	);
}
