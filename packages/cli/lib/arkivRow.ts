import type { Hex } from "viem";
import type { IncidentRow, ReleaseRow } from "../arkiv/writer";
import type { CliContext } from "./context";

export type PendingRow =
	| { kind: "release"; row: ReleaseRow }
	| { kind: "incident"; row: IncidentRow };

export type ArkivOutcome =
	| { status: "written"; entityKey: Hex; txHash: Hex }
	| { status: "skipped"; reason: string }
	| ({ status: "failed"; reason: string } & PendingRow);

export async function writeRow(
	ctx: CliContext,
	pending: PendingRow,
): Promise<ArkivOutcome> {
	const writer =
		pending.kind === "release" ? ctx.arkiv?.release : ctx.arkiv?.incident;
	if (!writer)
		return {
			status: "failed",
			reason:
				pending.kind === "release"
					? "CODEMARK_CI_KEY not set"
					: "CODEMARK_SEC_KEY not set",
			...pending,
		};
	try {
		const written =
			pending.kind === "release"
				? await writer.writeRelease(pending.row)
				: await writer.writeIncident(pending.row);
		return { status: "written", ...written };
	} catch (error) {
		const reason =
			error instanceof Error
				? (error.message.split("\n")[0] ?? "")
				: String(error);
		return { status: "failed", reason, ...pending };
	}
}

export function reviveRow(pending: PendingRow): PendingRow {
	const big = (v: unknown) =>
		v === undefined ? undefined : BigInt(v as string);
	if (pending.kind === "release")
		return {
			kind: "release",
			row: {
				...pending.row,
				resolverBlock: big(pending.row.resolverBlock) as bigint,
				regBlock: big(pending.row.regBlock) as bigint,
			},
		};
	return {
		kind: "incident",
		row: {
			...pending.row,
			block: big(pending.row.block) as bigint,
			linkBlock: big(pending.row.linkBlock),
		},
	};
}
