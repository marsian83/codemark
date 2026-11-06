import type { TargetResult } from "@codemark/shared/check";
import { formatDuration } from "@codemark/shared/check/explain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type ReactNode, useState } from "react";
import { isAddress } from "viem";
import { Address, CopyButton } from "../../components/Links";
import { VerdictCard } from "../../components/VerdictCard";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import {
	errorMessage,
	formatTimestamp,
	rpcErrorMessage,
	shortAddress,
} from "../../lib/format";
import { usePins } from "../../lib/pins";
import { useTitle } from "../../lib/useTitle";
import { account, readForkState, upgradeAccount } from "../../lib/wallet";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { Input } from "../../ui/Input";
import { Spinner } from "../../ui/Spinner";
import { cn } from "../../utils/cn";

const forkCommand = "bun run demo:fork";

function Stat({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className="text-xs text-typography-tertiary">{label}</dt>
			<dd className="truncate text-sm">{children}</dd>
		</div>
	);
}

function ForkStatus() {
	const state = useQuery({
		queryKey: ["fork-state"],
		queryFn: readForkState,
		refetchInterval: (q) => (q.state.status === "error" ? 8000 : 5000),
		retry: false,
	});
	if (state.isError)
		return (
			<Callout tone="warning">
				<div className="flex flex-col gap-2">
					<p>
						<span className="font-medium text-typography-primary">
							The demo fork isn't running.
						</span>{" "}
						Start it from the packages folder, then this page connects on its
						own.
					</p>
					<div className="flex w-fit items-center gap-1 rounded-md border border-border-secondary bg-background-container py-1 pr-1 pl-2.5 font-mono text-xs text-typography-primary">
						<Icon
							name="terminal"
							className="size-3.5 text-typography-tertiary"
						/>
						<span className="pl-1">{forkCommand}</span>
						<CopyButton value={forkCommand} label="command" />
					</div>
					<p className="text-xs text-typography-tertiary">
						Looking for it at {config.anvilRpc}. {errorMessage(state.error)}
					</p>
				</div>
			</Callout>
		);
	if (!state.data)
		return (
			<p className="flex items-center gap-2 text-sm text-typography-tertiary">
				<Spinner /> Connecting to the fork at {config.anvilRpc}…
			</p>
		);
	const offset = state.data.timestamp - Math.floor(Date.now() / 1000);
	return (
		<Card className="px-5 py-4">
			<dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
				<Stat label="Network">Local fork of Sepolia</Stat>
				<Stat label="Fork clock">{formatTimestamp(state.data.timestamp)}</Stat>
				<Stat label="Ahead of real time">
					{Math.abs(offset) < 120 ? "No" : formatDuration(Math.abs(offset))}
				</Stat>
				<Stat label="Account runs">
					{state.data.delegate ? (
						<span className="font-mono">
							{shortAddress(state.data.delegate)}
						</span>
					) : (
						"Its own code"
					)}
				</Stat>
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
	const client = useQueryClient();
	const [draft, setDraft] = useState("");
	const [target, setTarget] = useState<`0x${string}` | undefined>();
	const [draftError, setDraftError] = useState("");

	const check = useQuery({
		queryKey: ["wallet-check", target, pins],
		enabled: target !== undefined,
		queryFn: () =>
			runCheck(
				"fork",
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
		mutationFn: upgradeAccount,
		onSuccess: () => client.invalidateQueries({ queryKey: ["fork-state"] }),
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
				: "Sign and upgrade";

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
					It runs on a local fork with a public test key, never on live Sepolia.
				</p>
			</header>

			<section className="flex flex-col gap-3">
				<ForkStatus />
				<p className="flex flex-wrap items-center gap-1 text-xs text-typography-tertiary">
					Test account
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
						<Spinner /> Checking against the demo fork…
					</p>
				) : null}
				{check.isError ? (
					<Callout tone="error">
						Couldn't check the contract. {rpcErrorMessage(check.error)}
					</Callout>
				) : null}
				{result && !check.isFetching ? (
					<VerdictCard result={result} external={false} />
				) : null}
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
					<p className="flex flex-wrap items-center gap-1 text-sm text-success">
						<Icon name="circle-check" />
						Account upgraded on the fork.
						<span className="font-mono text-xs text-typography-tertiary break-all">
							{sign.data}
						</span>
					</p>
				) : null}
			</section>
		</main>
	);
}
