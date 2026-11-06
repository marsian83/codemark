import { resolve } from "node:path";

const source = process.env.CONTRACTS_V2_DIR;
if (!source) {
	throw new Error(
		"Set CONTRACTS_V2_DIR to a checkout of github.com/ensdomains/contracts-v2 at commit 07e55a05",
	);
}
const vendor = resolve(source, "contracts/deployments/sepolia");
const out = resolve(import.meta.dir, "../../lib/shared/ens/abi.generated.ts");

const contracts = {
	userRegistryAbi: "UserRegistryImpl",
	ethRegistryAbi: "ETHRegistry",
	permissionedResolverAbi: "PermissionedResolverImpl",
	verifiableFactoryAbi: "VerifiableFactory",
	ethRegistrarAbi: "ETHRegistrar",
	universalResolverAbi: "UniversalResolverV2",
	mockUsdcAbi: "MockUSDC",
};

type AbiItem = { type: string; name?: string };

const parts: string[] = [];
for (const [exportName, file] of Object.entries(contracts)) {
	const json = (await Bun.file(`${vendor}/${file}.json`).json()) as {
		address: string;
		abi: AbiItem[];
	};
	const abi = json.abi.filter((item) =>
		["function", "event", "error"].includes(item.type),
	);
	parts.push(`export const ${exportName} = ${JSON.stringify(abi)} as const;`);
}

await Bun.write(out, `${parts.join("\n\n")}\n`);
console.log("wrote", out);
