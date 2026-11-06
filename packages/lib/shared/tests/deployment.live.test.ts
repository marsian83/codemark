import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { createEnsClient } from "../ens/client";
import { liveRootRegistry } from "../ens/deployment";
import { findResolver, readAddr, walkRegistries } from "../ens/resolve";

const ens = createEnsClient(
	process.env.SEPOLIA_RPC_URL ?? "https://sepolia.gateway.tenderly.co",
);
const live = process.env.CODEMARK_LIVE_TESTS === "0" ? test.skip : test;

describe("live Sepolia deployment", () => {
	live(
		"the canonical Universal Resolver reads the configured root registry",
		async () => {
			const root = await liveRootRegistry(ens);
			expect(root).toBe(getAddress(ens.deployment.rootRegistry));
		},
		30000,
	);

	live(
		"eth resolves to the configured ETHRegistry",
		async () => {
			const path = await walkRegistries(ens, "eth");
			expect(path[1]).toBe(getAddress(ens.deployment.ethRegistry));
		},
		30000,
	);
});

describe("resolution reference names", () => {
	const mainnet = createEnsClient(
		process.env.MAINNET_RPC_URL ?? "https://mainnet.gateway.tenderly.co",
	);

	live(
		"ur.integration-tests.eth resolves to the current answer, not the outdated one",
		async () => {
			const name = "ur.integration-tests.eth";
			const { resolver } = await findResolver(mainnet, name);
			expect(await readAddr(mainnet, resolver, name, 60)).toBe(
				"0x2222222222222222222222222222222222222222",
			);
		},
		30000,
	);

	live(
		"test.offchaindemo.eth resolves through CCIP-Read",
		async () => {
			const name = "test.offchaindemo.eth";
			const { resolver } = await findResolver(mainnet, name);
			expect(getAddress(await readAddr(mainnet, resolver, name, 60))).toBe(
				"0x779981590E7Ccc0CFAe8040Ce7151324747cDb97",
			);
		},
		30000,
	);
});
