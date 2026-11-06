import { describe, expect, test } from "bun:test";
import { encodeFunctionData, namehash } from "viem";
import { permissionedResolverAbi } from "../ens/abi";
import { createEnsClient } from "../ens/client";
import { dnsEncode, findResolver } from "../ens/resolve";
import { coinTypeResource, registryRoles, textResource } from "../ens/roles";
import { sepoliaCoinType } from "../record";

const rpc = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";
const ens = createEnsClient(rpc);
const reachable = await ens.publicClient
	.getChainId()
	.then((id) => id === 11155111)
	.catch(() => false);
if (!reachable) console.warn(`ens tests skipped: no Sepolia fork at ${rpc}`);

describe("ens roles", () => {
	test("role bits match RegistryRolesLib", () => {
		expect(registryRoles.ROLE_UNREGISTER).toBe(0x1000n);
		expect(registryRoles.ROLE_WAS_RESERVED).toBe(1n << 32n);
		expect(registryRoles.ROLE_CAN_TRANSFER_ADMIN).toBe(1n << 156n);
	});
});

describe.skipIf(!reachable)("ens on a Sepolia fork", () => {
	const decode = (data: `0x${string}`) =>
		ens.publicClient.readContract({
			address: ens.deployment.permissionedResolverImpl,
			abi: permissionedResolverAbi,
			functionName: "decodeSetter",
			args: [data],
		});

	test("resource helpers match the deployed decodeSetter", async () => {
		const name = dnsEncode("x.eth");
		const [, textRes] = await decode(
			encodeFunctionData({
				abi: permissionedResolverAbi,
				functionName: "setText",
				args: [name, "codemark", ""],
			}),
		);
		expect(textRes).toBe(textResource("codemark"));
		const [, addrRes] = await decode(
			encodeFunctionData({
				abi: permissionedResolverAbi,
				functionName: "setAddress",
				args: [name, BigInt(sepoliaCoinType), "0x"],
			}),
		);
		expect(addrRes).toBe(coinTypeResource(sepoliaCoinType));
	});

	test("findResolver returns the node it resolved", async () => {
		const found = await findResolver(ens, "eth");
		expect(found.node).toBe(namehash("eth"));
	});
});
