import { normalizeName } from "@codemark/shared/names";
import type { Hex } from "viem";
import { env } from "../env";
import { envFilePath, setEnvValue } from "../lib/envFile";
import { addressFlag, requireArgs, stringFlag } from "../lib/flags";
import { contextFromEnv } from "../lib/fromEnv";
import { toJson } from "../lib/json";
import { requireSigner } from "../lib/signers";
import { ensureRootSafe, initPublisher } from "../ops/init";
import type { Command } from "./index";

export const init: Command = async (args, flags) => {
	const [input] = requireArgs(args, ["label"]) as [string];
	const name = normalizeName(input);
	const parts = name.split(".");
	if (parts.length > 2 || (parts.length === 2 && parts[1] !== "eth"))
		throw new Error(
			`init registers a .eth name through the ETHRegistrar; got ${name}`,
		);
	const label = parts[0] as string;
	const rpcUrl = stringFlag(flags, "rpc") ?? env.SEPOLIA_RPC_URL;
	const ctx = await contextFromEnv(rpcUrl);
	requireSigner(ctx.signers, "root");
	const sec = addressFlag(flags, "sec") ?? ctx.signers.sec?.account.address;
	if (!sec) throw new Error("--sec <address> or CODEMARK_SEC_KEY is required");
	if (!ctx.root) {
		const safe = await ensureRootSafe(
			ctx,
			rpcUrl,
			env.CODEMARK_ROOT_KEY as Hex,
		);
		await setEnvValue("CODEMARK_SAFE", safe.address);
		console.error(`CODEMARK_SAFE=${safe.address} written to ${envFilePath}`);
	}
	const years = BigInt(stringFlag(flags, "years") ?? "1");
	const result = await initPublisher(ctx, {
		label,
		sec,
		durationSeconds: years * 365n * 24n * 3600n,
	});
	console.log(toJson(result));
};
