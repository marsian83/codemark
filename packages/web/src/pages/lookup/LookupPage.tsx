import { contractArtifact } from "@codemark/shared";
import type { TargetRole } from "@codemark/shared/check";
import { roleLabel } from "@codemark/shared/check/explain";
import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import { CheckResult } from "../../components/CheckResult";
import HowItWorks from "../../components/HowItWorks";
import PinsEditor from "../../components/PinsEditor";
import SnapPanel from "../../components/SnapPanel";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import { usePins } from "../../lib/pins";
import { useTitle } from "../../lib/useTitle";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { fieldClass, Input } from "../../ui/Input";
import { cn } from "../../utils/cn";

const roles: TargetRole[] = [
	"call",
	"delegation",
	"delegatecall",
	"approval-spender",
];

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

	useEffect(() => {
		setDraft(address);
		setDraftRole(role);
		setDraftError("");
	}, [address, role]);

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

	function submit(event: FormEvent) {
		event.preventDefault();
		const value = draft.trim();
		if (!isAddress(value)) {
			setDraftError("Address must start with 0x and have 42 characters");
			return;
		}
		setDraftError("");
		const a = contractArtifact(config.chainId, value).split(":")[2] ?? value;
		if (a.toLowerCase() === address.toLowerCase() && draftRole === role) {
			query.refetch();
			return;
		}
		setParams({ a, role: draftRole });
	}

	const done = query.isSuccess;

	useEffect(() => {
		if (done)
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [done]);

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
			<main className="flex min-w-0 flex-col gap-8">
				<section className="flex flex-col gap-5">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight">
							Check a contract
						</h1>
						<p className="text-typography-secondary">
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
									className="h-10 pl-9 tabular"
									placeholder="0x… contract on Sepolia"
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
										"h-10 w-full appearance-none pr-9 sm:w-auto",
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
							<Button
								type="submit"
								loading={isAddress(address) && query.isFetching}
							>
								Check
							</Button>
						</div>
						{draftError ? (
							<p id="address-error" role="alert" className="text-error">
								{draftError}
							</p>
						) : null}
					</form>
					<p className="text-typography-secondary">
						No contract to hand?{" "}
						<Link
							to="/demo"
							className="text-primary underline underline-offset-4 transition-colors hover:text-primary-hover"
						>
							Try the demo
						</Link>
					</p>
				</section>

				{isAddress(address) ? (
					<section ref={resultRef} aria-live="polite" className="scroll-mt-28">
						<CheckResult query={query} />
					</section>
				) : (
					<HowItWorks />
				)}
			</main>
			<aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
				<PinsEditor />
				<SnapPanel />
			</aside>
		</div>
	);
}
