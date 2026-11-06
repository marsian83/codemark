import { contractArtifact } from "@codemark/shared";
import type { TargetResult, TargetRole } from "@codemark/shared/check";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import HowItWorks from "../../components/HowItWorks";
import { BlockLink } from "../../components/Links";
import PinsEditor from "../../components/PinsEditor";
import SnapPanel from "../../components/SnapPanel";
import { VerdictCard } from "../../components/VerdictCard";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import { formatTimestamp, rpcErrorMessage } from "../../lib/format";
import { usePins } from "../../lib/pins";
import { sampleResults } from "../../lib/samples";
import { useTitle } from "../../lib/useTitle";

const roles: { value: TargetRole; label: string }[] = [
	{ value: "call", label: "call" },
	{ value: "delegatecall", label: "delegatecall" },
	{ value: "delegation", label: "EIP-7702 delegation" },
	{ value: "approval-spender", label: "token approval spender" },
];

export default function LookupPage() {
	useTitle("Check a contract");
	const [params, setParams] = useSearchParams();
	const { pins } = usePins();
	const address = params.get("a") ?? "";
	const roleParam = params.get("role");
	const role: TargetRole =
		roles.find((r) => r.value === roleParam)?.value ?? "call";
	const [draft, setDraft] = useState(address);
	const [draftRole, setDraftRole] = useState<TargetRole>(role);
	const [draftError, setDraftError] = useState("");

	const query = useQuery({
		queryKey: ["check", address, role, pins],
		enabled: isAddress(address),
		queryFn: () =>
			runCheck(
				"sepolia",
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

	function submit(event: FormEvent) {
		event.preventDefault();
		const value = draft.trim();
		if (!isAddress(value)) {
			setDraftError(
				"Enter a 0x contract address. Frontend CIDs cannot be checked yet.",
			);
			return;
		}
		setDraftError("");
		setParams({
			a: contractArtifact(config.chainId, value).split(":")[2] ?? value,
			role: draftRole,
		});
	}

	return (
		<main className="space-y-8 pt-6">
			<section>
				<h1 className="text-lg font-semibold">Who published this contract?</h1>
				<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
					Reads Sepolia ENS from your browser. Nothing is sent to a Codemark
					server.
				</p>
				<form onSubmit={submit} className="mt-3 space-y-2">
					<input
						className="w-full rounded border border-zinc-300 bg-transparent px-2 py-2 font-mono text-sm dark:border-zinc-700"
						placeholder="0x… contract address on Sepolia"
						aria-label="Contract address"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<div className="flex flex-wrap items-center gap-2">
						<label className="text-sm" htmlFor="role">
							Used as
						</label>
						<select
							id="role"
							className="rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
							value={draftRole}
							onChange={(e) => setDraftRole(e.target.value as TargetRole)}
						>
							{roles.map((r) => (
								<option key={r.value} value={r.value}>
									{r.label}
								</option>
							))}
						</select>
						<button
							type="submit"
							className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
						>
							Check
						</button>
					</div>
					{draftError ? (
						<p role="alert" className="text-sm text-red-700 dark:text-red-400">
							{draftError}
						</p>
					) : null}
				</form>
			</section>

			{isAddress(address) ? (
				<section aria-live="polite">
					{query.isPending ? (
						<p className="text-sm">
							Reading Sepolia: resolving the release name, verifying the
							resolver, checking the key. This takes a few seconds.
						</p>
					) : null}
					{query.isError ? (
						<p role="alert" className="text-sm text-red-700 dark:text-red-400">
							Check failed. {rpcErrorMessage(query.error)}
						</p>
					) : null}
					{query.data ? (
						<div className="space-y-3">
							{query.data.result.results.map((r) => (
								<VerdictCard key={r.artifact + r.target.role} result={r} />
							))}
							<p className="text-xs text-zinc-500 dark:text-zinc-400">
								Sepolia block <BlockLink block={query.data.result.block} /> read
								at {formatTimestamp(query.data.now)}. Overall severity:{" "}
								{query.data.result.severity}.
							</p>
						</div>
					) : null}
				</section>
			) : (
				<section>
					<h2 className="text-sm font-semibold">Example of a result</h2>
					<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
						Each publisher that released the address gets one row: verdict,
						release name, key, version, age and whether the record is proven
						immutable.
						{config.exampleAddress ? (
							<>
								{" "}
								<a
									className="underline underline-offset-2"
									href={`/?a=${config.exampleAddress}&role=call`}
								>
									Check a published example
								</a>
								.
							</>
						) : null}
					</p>
					<div className="mt-3">
						<VerdictCard
							result={sampleResults[0]?.result as TargetResult}
							external={false}
						/>
						<p className="mt-1 text-xs text-zinc-500">
							Layout sample with placeholder values, not a live result.
						</p>
					</div>
				</section>
			)}

			<PinsEditor />
			<SnapPanel />
			<HowItWorks />
		</main>
	);
}
