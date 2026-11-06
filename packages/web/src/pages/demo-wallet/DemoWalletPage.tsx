import type { TargetResult } from "@codemark/shared/check";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { isAddress } from "viem";
import { Address } from "../../components/Links";
import { VerdictCard } from "../../components/VerdictCard";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import {
	errorMessage,
	formatDuration,
	formatTimestamp,
	rpcErrorMessage,
	shortAddress,
} from "../../lib/format";
import { usePins } from "../../lib/pins";
import { useTitle } from "../../lib/useTitle";
import { account, readForkState, upgradeAccount } from "../../lib/wallet";

const button =
	"rounded border border-zinc-400 px-3 py-1.5 text-sm dark:border-zinc-600";

function ForkClock() {
	const state = useQuery({
		queryKey: ["fork-state"],
		queryFn: readForkState,
		refetchInterval: 5000,
		retry: false,
	});
	if (state.isError) {
		return (
			<p role="alert" className="text-sm text-red-700 dark:text-red-400">
				Fork unreachable at {config.anvilRpc}: {errorMessage(state.error)}.
				Start it with the demo fork script, or set VITE_ANVIL_RPC_URL.
			</p>
		);
	}
	if (!state.data) return <p className="text-sm">Connecting to the fork…</p>;
	const offset = state.data.timestamp - Math.floor(Date.now() / 1000);
	return (
		<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
			<div>
				<dt className="text-xs text-zinc-500">Network</dt>
				<dd>Anvil fork of Sepolia (not live)</dd>
			</div>
			<div>
				<dt className="text-xs text-zinc-500">Fork clock</dt>
				<dd className="font-mono">{formatTimestamp(state.data.timestamp)}</dd>
			</div>
			<div>
				<dt className="text-xs text-zinc-500">Versus real time</dt>
				<dd>
					{Math.abs(offset) < 120
						? "not time-warped"
						: `${offset > 0 ? "+" : "-"}${formatDuration(Math.abs(offset))}`}
				</dd>
			</div>
			<div>
				<dt className="text-xs text-zinc-500">Account delegates to</dt>
				<dd className="font-mono">
					{state.data.delegate ? shortAddress(state.data.delegate) : "nothing"}
				</dd>
			</div>
		</dl>
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
		{ label: "AcmeDelegate", value: config.demoDelegate },
		{ label: "Sweeper", value: config.demoSweeper },
	].filter((p) => isAddress(p.value));

	function submit(event: FormEvent) {
		event.preventDefault();
		const value = draft.trim();
		if (!isAddress(value)) {
			setDraftError("Enter a 0x address for the delegate contract.");
			return;
		}
		setDraftError("");
		sign.reset();
		setTarget(value);
	}

	const reasons = result
		? result.verdicts.map(
				(v) => `${v.publisher}: ${v.verdict}${v.reason ? `, ${v.reason}` : ""}`,
			)
		: [];
	const buttonLabel = sign.isPending
		? "Signing…"
		: !result
			? "Sign authorization and upgrade"
			: blocked
				? "Blocked by Codemark"
				: result.severity === "info"
					? "Sign authorization and upgrade"
					: "Sign anyway";

	return (
		<main className="space-y-8 pt-6">
			<section>
				<h1 className="text-lg font-semibold">Upgrade account (EIP-7702)</h1>
				<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
					An EIP-7702 authorization gives a contract control of your account.
					This demo wallet checks the delegate with Codemark first. It runs on a
					local Anvil fork with a public test key, never on live Sepolia.
				</p>
			</section>
			<ForkClock />
			<p className="text-xs text-zinc-500">
				Account <Address value={account.address} external={false} /> (Anvil test
				key)
			</p>

			<section className="space-y-2">
				<h2 className="text-sm font-semibold">1. Choose the delegate</h2>
				<form onSubmit={submit} className="space-y-2">
					<input
						id="delegate"
						aria-label="Delegate contract"
						className="w-full rounded border border-zinc-300 bg-transparent px-2 py-2 font-mono text-sm dark:border-zinc-700"
						placeholder="0x… contract to delegate to"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						{presets.map((p) => (
							<button
								key={p.label}
								type="button"
								className={button}
								onClick={() => setDraft(p.value)}
							>
								Use {p.label}
							</button>
						))}
					</div>
					{draftError ? (
						<p role="alert" className="text-sm text-red-700 dark:text-red-400">
							{draftError}
						</p>
					) : null}
					<h2 className="pt-4 text-sm font-semibold">2. Check it</h2>
					<button
						type="submit"
						disabled={check.isFetching}
						className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
					>
						{check.isFetching ? "Checking…" : "Check delegate"}
					</button>
				</form>
				{check.isFetching ? (
					<p className="text-sm">
						Reading the fork at its own clock: resolving the release, verifying
						the resolver, checking the key.
					</p>
				) : null}
				{check.isError ? (
					<p role="alert" className="text-sm text-red-700 dark:text-red-400">
						Check failed. {rpcErrorMessage(check.error)}
					</p>
				) : null}
				{result && !check.isFetching ? (
					<VerdictCard result={result} external={false} />
				) : null}
			</section>

			<section className="space-y-2">
				<h2 className="text-sm font-semibold">3. Sign</h2>
				{!result ? (
					<p className="text-sm text-zinc-600 dark:text-zinc-400">
						Signing is enabled after the delegate has been checked.
					</p>
				) : null}
				{blocked ? (
					<div
						role="status"
						className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
					>
						<p className="font-semibold">
							Blocked: rated critical. {result?.headline}
						</p>
						{reasons.length > 0 ? (
							<ul className="mt-1 list-disc pl-5">
								{reasons.map((r) => (
									<li key={r}>{r}</li>
								))}
							</ul>
						) : (
							<p className="mt-1">No publisher has released this address.</p>
						)}
					</div>
				) : null}
				{result && !blocked && result.severity !== "info" ? (
					<p className="text-sm">
						Rated {result.severity}, not verified. Signing is allowed but not
						recommended.
					</p>
				) : null}
				<button
					type="button"
					className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
					disabled={!result || blocked || check.isFetching || sign.isPending}
					onClick={() => target && sign.mutate(target)}
				>
					{buttonLabel}
				</button>
				{sign.isError ? (
					<p role="alert" className="text-sm text-red-700 dark:text-red-400">
						Transaction failed. {rpcErrorMessage(sign.error)}
					</p>
				) : null}
				{sign.data ? (
					<p className="break-all font-mono text-xs">
						Upgraded on the fork in transaction {sign.data}
					</p>
				) : null}
			</section>
		</main>
	);
}
