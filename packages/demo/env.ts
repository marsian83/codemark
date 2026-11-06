import { keccak256, toHex } from "viem";
import { z } from "zod";

const demoKey = (role: string) => keccak256(toHex(`codemark-demo-${role}`));

const anvilKeys = {
	root: demoKey("root"),
	sec: demoKey("sec"),
	ci: demoKey("ci"),
};

const schema = z.object({
	ANVIL_RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
	SEPOLIA_RPC_URL: z
		.string()
		.url()
		.default("https://sepolia.gateway.tenderly.co"),
	FORK_BLOCK: z.coerce.bigint().optional(),
	ANVIL_BIN: z.string().default(`${process.env.HOME}/.foundry/bin/anvil`),
	ARKIV_ACCESS_KEY: z.string().default(""),
	SEED_ARKIV: z.string().default(""),
	LIVE_LABEL: z.string().optional(),
	STATE_DIR: z.string().default(new URL("./state", import.meta.url).pathname),
	CODEMARK_ROOT_KEY: z.string().default(anvilKeys.root),
	CODEMARK_SEC_KEY: z.string().default(anvilKeys.sec),
	CODEMARK_CI_KEY: z.string().default(anvilKeys.ci),
});

export const env = schema.parse(process.env);
