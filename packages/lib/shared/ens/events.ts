import { getAbiItem } from "viem";
import {
	permissionedResolverAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "./abi";

export const labelRegisteredEvent = getAbiItem({
	abi: userRegistryAbi,
	name: "LabelRegistered",
});

export const labelUnregisteredEvent = getAbiItem({
	abi: userRegistryAbi,
	name: "LabelUnregistered",
});

export const subregistryUpdatedEvent = getAbiItem({
	abi: userRegistryAbi,
	name: "SubregistryUpdated",
});

export const proxyDeployedEvent = getAbiItem({
	abi: verifiableFactoryAbi,
	name: "ProxyDeployed",
});

export const resolverUpgradedEvent = getAbiItem({
	abi: permissionedResolverAbi,
	name: "Upgraded",
});
