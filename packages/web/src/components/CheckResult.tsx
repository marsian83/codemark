import type { CheckResult as Result } from "@codemark/shared/check";
import type { Thresholds } from "@codemark/shared/check/severity";
import type { UseQueryResult } from "@tanstack/react-query";
import { formatTimestamp, rpcErrorMessage } from "../lib/format";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";
import { Spinner } from "../ui/Spinner";
import { BlockLink } from "./Links";
import { VerdictCard } from "./VerdictCard";

function Pending() {
	return (
		<Card className="flex items-start gap-3 p-5">
			<Spinner className="mt-0.5 text-typography-tertiary" />
			<div className="flex flex-col gap-1">
				<p className="font-medium">Checking on Sepolia</p>
				<p className="text-typography-secondary">
					Finding the release, then confirming its record can't change and its
					key is still active. This takes a few seconds.
				</p>
			</div>
		</Card>
	);
}

export function CheckResult({
	query,
	thresholds,
}: {
	query: UseQueryResult<{ result: Result; now: number }>;
	thresholds?: Thresholds;
}) {
	if (query.isPending || query.isFetching) return <Pending />;
	if (query.isError)
		return (
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
		);
	return (
		<div className="flex flex-col gap-3">
			{query.data.result.results.map((r) => (
				<VerdictCard
					key={r.artifact + r.target.role}
					result={r}
					thresholds={thresholds}
				/>
			))}
			<p className="text-xs text-typography-tertiary">
				Read at Sepolia block <BlockLink block={query.data.result.block} />,{" "}
				{formatTimestamp(query.data.now)}
			</p>
		</div>
	);
}
