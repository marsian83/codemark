import { permissionedResolverAbi } from "@codemark/shared/ens/abi";
import { dnsEncode } from "@codemark/shared/ens/resolve";
import { recordKey, sepoliaCoinType } from "@codemark/shared/record";
import { type Address, encodeFunctionData, type Hex } from "viem";

export function setTextCall(name: string, key: string, value: string): Hex {
	return encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "setText",
		args: [dnsEncode(name), key, value],
	});
}

export function setAddressCall(
	name: string,
	address: Address,
	coinType: number | bigint = sepoliaCoinType,
): Hex {
	return encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "setAddress",
		args: [dnsEncode(name), BigInt(coinType), address],
	});
}

export function setContenthashCall(name: string, hash: Hex): Hex {
	return encodeFunctionData({
		abi: permissionedResolverAbi,
		functionName: "setContenthash",
		args: [dnsEncode(name), hash],
	});
}

export function releaseRecordCalls(
	names: string[],
	record: string,
	target?: Address,
	contenthash?: Hex,
): Hex[] {
	return names.flatMap((name) => [
		...(target ? [setAddressCall(name, target)] : []),
		...(contenthash ? [setContenthashCall(name, contenthash)] : []),
		setTextCall(name, recordKey, record),
	]);
}
