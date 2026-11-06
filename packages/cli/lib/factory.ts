import {
	permissionedResolverAbi,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "@codemark/shared/ens/abi";
import {
	type Address,
	encodeFunctionData,
	type Hex,
	keccak256,
	parseEventLogs,
	toHex,
} from "viem";
import type { CliContext } from "./context";
import type { Signer } from "./signers";
import { type Sent, send } from "./tx";

export type Grant = { account: Address; roleBitmap: bigint };
export type Deployed = Sent & { address: Address; salt: bigint };

export function saltFor(seed: string): bigint {
	return BigInt(keccak256(toHex(`${seed}:${Date.now()}:${Math.random()}`)));
}

async function deployProxy(
	ctx: CliContext,
	signer: Signer,
	implementation: Address,
	salt: bigint,
	data: Hex,
): Promise<Deployed> {
	const sent = await send(ctx, signer, {
		address: ctx.ens.deployment.verifiableFactory,
		abi: verifiableFactoryAbi,
		functionName: "deployProxy",
		args: [implementation, salt, data],
	});
	const [deployed] = parseEventLogs({
		abi: verifiableFactoryAbi,
		eventName: "ProxyDeployed",
		logs: sent.receipt.logs,
	});
	if (!deployed) throw new Error(`no ProxyDeployed in ${sent.hash}`);
	return { ...sent, address: deployed.args.proxyAddress, salt };
}

export function deployRegistry(
	ctx: CliContext,
	signer: Signer,
	grants: Grant[],
	salt: bigint,
): Promise<Deployed> {
	const data = encodeFunctionData({
		abi: userRegistryAbi,
		functionName: "initialize",
		args: [grants],
	});
	return deployProxy(
		ctx,
		signer,
		ctx.ens.deployment.userRegistryImpl,
		salt,
		data,
	);
}

export function deployResolver(
	ctx: CliContext,
	signer: Signer,
	grants: Grant[],
	calls: Hex[],
	salt: bigint,
): Promise<Deployed> {
	const data = encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "initialize",
		args: [grants, calls],
	});
	return deployProxy(
		ctx,
		signer,
		ctx.ens.deployment.permissionedResolverImpl,
		salt,
		data,
	);
}
