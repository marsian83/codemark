import { parseAbi } from "viem";
import {
	ethRegistrarAbi,
	ethRegistryAbi,
	mockUsdcAbi,
	permissionedResolverAbi,
	universalResolverAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "./abi.generated";

export {
	ethRegistrarAbi,
	ethRegistryAbi,
	mockUsdcAbi,
	permissionedResolverAbi,
	universalResolverAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
};

export const registryAbi = userRegistryAbi;

export const resolverProfileAbi = parseAbi([
	"function text(bytes32 node, string key) view returns (string)",
	"function addr(bytes32 node, uint256 coinType) view returns (bytes)",
	"function contenthash(bytes32 node) view returns (bytes)",
]);

export const resolverAbi = [
	...permissionedResolverAbi,
	...resolverProfileAbi,
] as const;

export const erc1967Abi = parseAbi([
	"event Upgraded(address indexed implementation)",
	"function upgradeToAndCall(address newImplementation, bytes data) payable",
]);

export const erc1967ImplementationSlot =
	"0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
