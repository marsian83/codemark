import type { CliContext } from "@codemark/cli/lib/context";
import { signersFromKeys } from "@codemark/cli/lib/signers";
import { safeRoot } from "@codemark/cli/safe/batch";
import { deploySafe } from "@codemark/cli/safe/deploy";
import { createEnsClient } from "@codemark/shared/ens/client";
import { type Address, type Hex, parseEther } from "viem";
import { env } from "../env";
import { anvil } from "./anvil";

export async function forkContext(
	url = env.ANVIL_RPC_URL,
	log: (message: string) => void = console.log,
	options: { safe?: Address } = {},
): Promise<CliContext> {
	const node = anvil(url);
	const signers = signersFromKeys(
		{
			root: env.CODEMARK_ROOT_KEY,
			sec: env.CODEMARK_SEC_KEY,
			ci: env.CODEMARK_CI_KEY,
		},
		url,
	);
	for (const signer of Object.values(signers))
		await node.setBalance(signer.account.address, parseEther("100"));
	const ctx: CliContext = {
		ens: createEnsClient(url, { pollingInterval: 100 }),
		signers,
		log,
		waitSeconds: async (seconds) => {
			await node.increaseTime(seconds);
		},
		sameBlock: async (run) => {
			await node.setAutomine(false);
			try {
				const result = await run();
				await node.mine();
				return result;
			} finally {
				await node.setAutomine(true);
			}
		},
	};
	const ownerKey = env.CODEMARK_ROOT_KEY as Hex;
	const owner = signers.root;
	if (!owner) throw new Error("CODEMARK_ROOT_KEY is required");
	const safe =
		options.safe ?? (await deploySafe(ctx, url, ownerKey, owner)).address;
	ctx.root = await safeRoot(ctx, url, ownerKey, safe);
	return ctx;
}
