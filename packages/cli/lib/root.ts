import type { Address, Hex } from "viem";
import type { CliContext } from "./context";
import type { Sent } from "./tx";

export type BatchCall = { to: Address; data: Hex; value?: bigint };

export type RootExecutor = {
	address: Address;
	execute(calls: BatchCall[]): Promise<Sent>;
};

export function requireRoot(ctx: CliContext): RootExecutor {
	if (!ctx.root)
		throw new Error(
			"this command needs the root Safe (CODEMARK_SAFE and its owner CODEMARK_ROOT_KEY); nothing was sent",
		);
	return ctx.root;
}
