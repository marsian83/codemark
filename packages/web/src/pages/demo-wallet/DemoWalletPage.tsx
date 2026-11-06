import type { TargetResult } from "@codemark/shared/check";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";
import { isAddress } from "viem";
import { Address } from "../../components/Links";
import { VerdictCard } from "../../components/VerdictCard";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import {
	errorMessage,
	formatTimestamp,
	rpcErrorMessage,
} from "../../lib/format";
import { usePins } from "../../lib/pins";
import { useTitle } from "../../lib/useTitle";
import { account, readChainHead, signUpgrade } from "../../lib/wallet";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { Input } from "../../ui/Input";
import { Spinner } from "../../ui/Spinner";
import { cn } from "../../utils/cn";

function Stat({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="text-xs text-typography-tertiary">{label}</dt>
			<dd className="truncate text-sm">{children}</dd>
		</div>
	);
}

function NetworkStatus() {
	const state = useQuery({
		queryKey: ["chain-head"],
		queryFn: readChainHead,
		refetchInterval: (q) => (q.state.status === "error" ? 8000 : 12000),
		retry: false,
	});
	if (state.isError)
		return (
			<Callout tone="warning">
				Couldn't reach Sepolia. This page keeps trying.{" "}
				{errorMessage(state.error)}
			</Callout>
		);
	if (!state.data)
		return (
			<p className="flex items-center gap-2 text-sm text-typography-tertiary">
				<Spinner /> Connecting to Sepolia…
			</p>
		);
	return (
		<Card className="px-5 py-4">
			<dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
				<Stat label="Network">Sepolia</Stat>
				<Stat label="Latest block">
					<span className="tabular font-mono">
						{state.data.blockNumber.toString()}
					</span>
				</Stat>
				<Stat label="Block time">{formatTimestamp(state.data.timestamp)}</Stat>
			</dl>
		</Card>
	);
}

function StepHeading({
	n,
	title,
	done,
}: {
	n: number;
	title: string;
	done?: boolean;
}) {
	return (
		<h2 className="flex items-center gap-2.5 font-medium">
			<span
				className={cn(
					"flex-center tabular size-6 rounded-full border font-mono text-xs",
					done
						? "border-success/30 bg-success/10 text-success"
						: "border-border-primary text-typography-tertiary",
				)}
			>
				{done ? <Icon name="check" className="size-3.5" /> : n}
			</span>
			{title}
		</h2>
	);
}

export default function DemoWalletPage() {
	useTitle("Account upgrade demo");
	const { pins } = usePins();
	const [draft, setDraft] = useState("");
	const [target, setTarget] = useState<`0x${string}` | undefined>();
	const [draftError, setDraftError] = useState("");

	const check = useQuery({
		queryKey: ["wallet-check", target, pins],
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
				pins,
			),
	});

	const sign = useMutation({
		mutationFn: signUpgrade,
	});

	const result: TargetResult | undefined = check.data?.result.results[0];
	const blocked = result?.severity === "critical";
	const presets = [
		{
			label: "PwnmeDelegate",
			detail: "Released by pwnmeswap.eth",
			value: config.demoDelegate,
		},
		{
			label: "Sweeper",
			detail: "Not released by any publisher",
			value: config.demoSweeper,
		},
	].filter((p) => isAddress(p.value));

	function choose(value: string) {
		const v = value.trim();
		if (!isAddress(v)) {
			setDraftError(
				"Enter a contract address that starts with 0x and has 40 hex characters.",
			);
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

	const signLabel = sign.isPending
		? "Signing…"
		: blocked
			? "Can't sign"
			: result && result.severity !== "info"
				? "Sign anyway"
				: "Sign upgrade";

	return (
		<main className="flex max-w-3xl flex-col gap-8">
			<header className="flex flex-col gap-2">
				<span className="text-xs text-typography-tertiary">Demo wallet</span>
				<h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
					Upgrade an account without handing it to a stranger
				</h1>
				<p className="max-w-2xl text-base text-typography-secondary text-pretty">
					An EIP-7702 upgrade gives a contract full control of your account.
					This wallet checks the contract with Codemark before it lets you sign.
					It checks live Sepolia with a throwaway key made in this tab, and
					signs the upgrade without sending it, so nothing changes on chain.
				</p>
			</header>

			<section className="flex flex-col gap-3">
				<NetworkStatus />
				<p className="flex flex-wrap items-center gap-1 text-xs text-typography-tertiary">
					Throwaway account
					<Address value={account.address} short external={false} />
				</p>
			</section>

			<section className="flex flex-col gap-4">
				<StepHeading n={1} title="Choose the contract" done={!!target} />
				{presets.length > 0 ? (
					<div className="grid gap-2 sm:grid-cols-2">
						{presets.map((p) => {
							const active = target?.toLowerCase() === p.value.toLowerCase();
							return (
								<button
									key={p.label}
									type="button"
									aria-pressed={active}
									onClick={() => {
										setDraft(p.value);
										choose(p.value);
									}}
									className={cn(
										"flex flex-col rounded-lg border px-3 py-2.5 text-left transition-colors duration-150",
										active
											? "border-primary/60 bg-primary/8 ring-1 ring-primary/30"
											: "border-border-secondary bg-background-container hover:border-border-primary",
									)}
								>
									<span className="text-sm font-medium">{p.label}</span>
									<span className="text-xs text-typography-tertiary">
										{p.detail}
									</span>
								</button>
							);
						})}
					</div>
				) : null}
				<form onSubmit={submit} noValidate className="flex flex-col gap-2">
					<div className="flex gap-2">
						<Input
							className="font-mono"
							placeholder="0x… or paste any contract"
							aria-label="Contract to upgrade to"
							aria-invalid={draftError ? true : undefined}
							spellCheck={false}
							autoComplete="off"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
						/>
						<Button type="submit" variant="secondary">
							Check it
						</Button>
					</div>
					{draftError ? (
						<p role="alert" className="text-sm text-error">
							{draftError}
						</p>
					) : null}
				</form>
			</section>

			<section className="flex flex-col gap-4">
				<StepHeading n={2} title="Codemark checks it" done={!!result} />
				{!target ? (
					<p className="text-sm text-typography-tertiary">
						Pick a contract above to check it.
					</p>
				) : null}
				{check.isFetching ? (
					<p className="flex items-center gap-2 text-sm text-typography-tertiary">
						<Spinner /> Checking on Sepolia…
					</p>
				) : null}
				{check.isError ? (
					<Callout tone="error">
						Couldn't check the contract. {rpcErrorMessage(check.error)}
					</Callout>
				) : null}
				{result && !check.isFetching ? <VerdictCard result={result} /> : null}
			</section>

			<section className="flex flex-col gap-4">
				<StepHeading n={3} title="Sign" done={!!sign.data} />
				{blocked ? (
					<Callout tone="error">
						This wallet won't sign it. Handing your account to this contract
						could let it take everything.
					</Callout>
				) : null}
				{result && !blocked && result.severity !== "info" ? (
					<Callout tone="warning">
						Codemark couldn't verify it. You can still sign, but it isn't
						recommended.
					</Callout>
				) : null}
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant={blocked ? "secondary" : "primary"}
						size="lg"
						loading={sign.isPending}
						disabled={!result || blocked || check.isFetching}
						onClick={() => target && sign.mutate(target)}
					>
						{blocked ? <Icon name="lock" /> : null}
						{signLabel}
					</Button>
					{!result ? (
						<span className="text-sm text-typography-tertiary">
							Check the contract first. Signing unlocks after that.
						</span>
					) : null}
				</div>
				{sign.isError ? (
					<Callout tone="error">
						The upgrade didn't go through. {rpcErrorMessage(sign.error)}
					</Callout>
				) : null}
				{sign.data ? (
					<div className="flex flex-col gap-1 text-sm">
						<p className="flex flex-wrap items-center gap-1 text-success">
							<Icon name="circle-check" />
							Upgrade signed. It wasn't sent, so the account is unchanged.
						</p>
						<p className="font-mono text-xs text-typography-tertiary break-all">
							r {sign.data.r}
						</p>
						<p className="font-mono text-xs text-typography-tertiary break-all">
							s {sign.data.s}
						</p>
					</div>
				) : null}
			</section>
		</main>
	);
}
