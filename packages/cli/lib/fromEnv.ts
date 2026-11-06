import { createEnsClient } from "@codemark/shared/ens/client";
import type { Address, Hex } from "viem";
import { env } from "../env";
import { safeRoot } from "../safe/batch";
import { createArkivWriters } from "./arkiv";
import type { CliContext } from "./context";
import { signersFromKeys } from "./signers";

export async function contextFromEnv(
	rpcUrl = env.SEPOLIA_RPC_URL,
): Promise<CliContext> {
	const ctx: CliContext = {
		ens: createEnsClient(rpcUrl),
		signers: signersFromKeys(
			{
				root: env.CODEMARK_ROOT_KEY,
				sec: env.CODEMARK_SEC_KEY,
				ci: env.CODEMARK_CI_KEY,
			},
			rpcUrl,
		),
		arkiv: createArkivWriters(env.ARKIV_ACCESS_KEY, {
			ci: env.CODEMARK_CI_KEY,
			sec: env.CODEMARK_SEC_KEY,
		}),
		log: (message) => console.error(message),
	};
	if (env.CODEMARK_SAFE && !env.CODEMARK_ROOT_KEY)
		throw new Error(
			"CODEMARK_SAFE is set but its owner CODEMARK_ROOT_KEY is not",
		);
	if (env.CODEMARK_ROOT_KEY && env.CODEMARK_SAFE)
		ctx.root = await safeRoot(
			ctx,
			rpcUrl,
			env.CODEMARK_ROOT_KEY as Hex,
			env.CODEMARK_SAFE as Address,
		);
	return ctx;
}
