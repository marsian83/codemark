import {
	ethRegistrarAbi,
	ethRegistryAbi,
	permissionedResolverAbi,
	universalResolverAbi,
	verifiableFactoryAbi,
} from "@codemark/shared/ens/abi";
import { createEnsClient } from "@codemark/shared/ens/client";
import { findResolver, readText } from "@codemark/shared/ens/resolve";
import { registryRoles } from "@codemark/shared/ens/roles";

const ens = createEnsClient(process.env.SEPOLIA_RPC_URL);
const { publicClient, deployment: d } = ens;

const block = await publicClient.getBlockNumber();
const read = (label: string, p: Promise<unknown>) =>
	p.then(
		(value) => console.log(label, value),
		(error: unknown) =>
			console.log(label, "REVERT", String(error).split("\n")[0]),
	);

console.log("sepolia block", block);
await read(
	"root.getSubregistry(eth)",
	publicClient.readContract({
		address: d.rootRegistry,
		abi: ethRegistryAbi,
		functionName: "getSubregistry",
		args: ["eth"],
	}),
);
await read(
	"UR.ROOT_REGISTRY",
	publicClient.readContract({
		address: d.universalResolver,
		abi: universalResolverAbi,
		functionName: "ROOT_REGISTRY",
	}),
);
await read(
	"ETHRegistry.hasRootRoles(REGISTRAR, ETHRegistrar)",
	publicClient.readContract({
		address: d.ethRegistry,
		abi: ethRegistryAbi,
		functionName: "hasRootRoles",
		args: [registryRoles.ROLE_REGISTRAR, d.ethRegistrar],
	}),
);
await read(
	"ETHRegistrar.MIN_COMMITMENT_AGE",
	publicClient.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "MIN_COMMITMENT_AGE",
	}),
);
await read(
	"ETHRegistrar.getRegisterPrice(acmeswap, 1y, USDC)",
	publicClient.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "getRegisterPrice",
		args: ["acmeswap", 31536000n, d.mockUsdc],
	}),
);
await read(
	"ETHRegistrar.isAvailable(acmeswap)",
	publicClient.readContract({
		address: d.ethRegistrar,
		abi: ethRegistrarAbi,
		functionName: "isAvailable",
		args: ["acmeswap"],
	}),
);
await read(
	"VF.proxyLogic",
	publicClient.readContract({
		address: d.verifiableFactory,
		abi: verifiableFactoryAbi,
		functionName: "proxyLogic",
	}),
);
await read(
	"PermissionedResolverImpl.ROOT_RESOURCE",
	publicClient.readContract({
		address: d.permissionedResolverImpl,
		abi: permissionedResolverAbi,
		functionName: "ROOT_RESOURCE",
	}),
);
await read(
	"VF.verifyContract(UserRegistryImpl) expect revert",
	publicClient.readContract({
		address: d.verifiableFactory,
		abi: verifiableFactoryAbi,
		functionName: "verifyContract",
		args: [d.userRegistryImpl],
	}),
);
await read("UR.findResolver(eth)", findResolver(ens, "eth"));

const name = process.argv[2];
if (name) {
	const found = await findResolver(ens, name);
	console.log(name, found);
	if (!found.inherited)
		console.log(
			"codemark text",
			await readText(ens, found.resolver, name, "codemark"),
		);
}
