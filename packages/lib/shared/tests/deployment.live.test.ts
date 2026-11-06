import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { createEnsClient } from "../ens/client";
import { liveRootRegistry } from "../ens/deployment";
import { walkRegistries } from "../ens/resolve";

const ens = createEnsClient(process.env.SEPOLIA_RPC_URL);

describe("live Sepolia deployment", () => {
	test("the canonical Universal Resolver reads the configured root registry", async () => {
		const root = await liveRootRegistry(ens);
		expect(root).toBe(getAddress(ens.deployment.rootRegistry));
	}, 30000);

	test("eth resolves to the configured ETHRegistry", async () => {
		const path = await walkRegistries(ens, "eth");
		expect(path[1]).toBe(getAddress(ens.deployment.ethRegistry));
	}, 30000);
});
