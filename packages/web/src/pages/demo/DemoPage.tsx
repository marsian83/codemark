import type { TargetRole } from "@codemark/shared/check";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { isAddress } from "viem";
import { CheckResult } from "../../components/CheckResult";
import { runCheck } from "../../lib/checker";
import { config } from "../../lib/config";
import { demoScenarios, demoTeam } from "../../lib/demo";
import { errorMessage } from "../../lib/format";
import { proposeTransaction } from "../../lib/snap";
import { useTitle } from "../../lib/useTitle";
import { Button } from "../../ui/Button";
import { Callout } from "../../ui/Callout";
import { Card } from "../../ui/Card";
import { Icon } from "../../ui/Icon";
import { cn } from "../../utils/cn";

const firstScenario = demoScenarios[0] as (typeof demoScenarios)[number];

export default function DemoPage() {
	useTitle("Demo");
	const [params, setParams] = useSearchParams();
	const resultRef = useRef<HTMLElement>(null);
	const adhoc = params.get("a") ?? "";
	const scenario = isAddress(adhoc)
		? undefined
		: (demoScenarios.find((s) => s.id === params.get("c")) ?? firstScenario);
	const address = scenario?.address ?? (adhoc as `0x${string}`);
	const role: TargetRole = scenario?.role ?? "call";
	const pins = scenario?.pins ?? [demoTeam];

	const query = useQuery({
		queryKey: ["demo-check", address, role, pins.length],
		queryFn: () =>
			runCheck(
				[{ address, chainId: config.chainId, role, via: "lookup" }],
				pins,
			),
	});

	const send = useMutation({ mutationFn: proposeTransaction });
	useEffect(() => send.reset(), [address]);

	const chosen = params.get("c");
	const done = query.isSuccess && !query.isFetching;

	useEffect(() => {
		if (chosen && done && window.matchMedia("(max-width: 64rem)").matches)
			resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	}, [chosen, done]);

	return (
		<main className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
			<div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-semibold tracking-tight">
						Sample contracts
					</h1>
					<p className="text-typography-secondary">
						Each runs the same check as the app and Snap.
					</p>
				</div>
				<Card className="overflow-hidden">
					<ul className="flex flex-col divide-y divide-border-secondary">
						{demoScenarios.map((s) => {
							const active = scenario?.id === s.id;
							return (
								<li key={s.id}>
									<button
										type="button"
										aria-pressed={active}
										onClick={() => setParams({ c: s.id })}
										className={cn(
											"flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
											active
												? "bg-background-raised shadow-[inset_0.125rem_0_0_var(--color-primary)]"
												: "hover:bg-background-raised",
										)}
									>
										<Icon
											name={s.icon}
											className="mt-0.5 text-typography-tertiary"
										/>
										<span className="flex min-w-0 flex-col">
											<span className="font-medium">{s.label}</span>
											<span className="text-typography-secondary">
												{s.hint}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</Card>
				<Link
					to="/demo/upgrade"
					className="inline-flex w-fit items-center gap-1.5 font-medium text-typography-secondary transition-colors hover:text-typography-primary"
				>
					Next, try an account upgrade
					<Icon name="arrow-right" />
				</Link>
			</div>
			<section
				ref={resultRef}
				aria-live="polite"
				className="flex min-w-0 scroll-mt-28 flex-col gap-3"
			>
				<p className="flex items-center gap-1.5 text-typography-secondary">
					<Icon name={pins.length > 0 ? "pin" : "pin-off"} />
					{pins.length > 0
						? `You trust ${demoTeam.name} in this check`
						: "You trust no team in this check"}
				</p>
				<CheckResult query={query} />
				<Card className="flex flex-col gap-3 p-5">
					<h2 className="flex items-center gap-2 font-medium">
						<Icon name="wallet" className="text-typography-tertiary" />
						Try it in your wallet
					</h2>
					<p className="text-typography-secondary">
						Opens a Sepolia transaction to this contract in your wallet. With
						the Codemark Snap installed, the same check shows up in the
						confirmation. Reject it and nothing is sent.
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							variant="secondary"
							loading={send.isPending}
							onClick={() => send.mutate(address)}
						>
							<Icon name="wallet" />
							{send.isPending
								? "Waiting for wallet…"
								: "Try wallet transaction"}
						</Button>
					</div>
					{send.isError ? (
						<Callout tone="warning">
							Nothing was sent. {errorMessage(send.error)}
						</Callout>
					) : null}
					{send.data ? (
						<p className="flex items-center gap-1.5 font-medium text-success">
							<Icon name="circle-check" />
							Sent. This was a real Sepolia transaction.
						</p>
					) : null}
				</Card>
			</section>
		</main>
	);
}
