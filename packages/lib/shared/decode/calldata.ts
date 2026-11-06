import {
	type Address,
	decodeAbiParameters,
	decodeFunctionData,
	getAddress,
	type Hex,
	hexToBigInt,
	hexToNumber,
	size,
	slice,
} from "viem";
import type { Target, TargetRole } from "../check/types";
import {
	erc20ApprovalAbi,
	executeAbi,
	executionListParams,
	handoverAbi,
	handoverVia,
	multiSendAbi,
	permit2Abi,
	permit2Address,
	safeAbi,
	safeAdminAbi,
	safeAdminVia,
	safeModuleExecAbi,
	safeProxyFactoryAbi,
	safeSetupAbi,
} from "./abis";
import { multiSend, multiSendCallOnly } from "./safeMultiSend";

const multiSendSet = new Set<string>([...multiSend, ...multiSendCallOnly]);
const maxDepth = 4;

export function isMultiSend(address: Address) {
	return multiSendSet.has(address.toLowerCase());
}

export type InnerCall = {
	operation: number;
	to: Address;
	value: bigint;
	data: Hex;
};

export function unpackMultiSend(packed: Hex): InnerCall[] {
	const calls: InnerCall[] = [];
	const total = size(packed);
	let at = 0;
	while (at < total) {
		if (at + 85 > total) throw new Error("truncated MultiSend entry");
		const operation = hexToNumber(slice(packed, at, at + 1));
		const to = getAddress(slice(packed, at + 1, at + 21));
		const value = hexToBigInt(slice(packed, at + 21, at + 53));
		const length = Number(hexToBigInt(slice(packed, at + 53, at + 85)));
		if (at + 85 + length > total) throw new Error("truncated MultiSend data");
		const data = slice(packed, at + 85, at + 85 + length);
		calls.push({ operation, to, value, data });
		at += 85 + length;
	}
	return calls;
}

function roleFor(operation: number): TargetRole {
	return operation === 0 ? "call" : "delegatecall";
}

function selectorOf(data: Hex | undefined) {
	return data && size(data) >= 4 ? slice(data, 0, 4) : undefined;
}

function tryDecode<T extends readonly unknown[]>(abi: T, data: Hex) {
	try {
		return decodeFunctionData({ abi: abi as never, data }) as unknown as {
			functionName: string;
			args: readonly unknown[];
		};
	} catch {
		return undefined;
	}
}

export type Collector = {
	out: Target[];
	chainId: number;
	from?: Address;
};

export function add(
	c: Collector,
	address: Address,
	role: TargetRole,
	via: string,
) {
	const normal = getAddress(address);
	if (isZero(normal)) return;
	if (c.out.some((t) => t.address === normal && t.role === role)) return;
	c.out.push({ address: normal, chainId: c.chainId, role, via });
}

function isZero(address: Address) {
	return /^0x0{40}$/.test(address);
}

function spenderOf(args: readonly unknown[]) {
	return args[0] as Address;
}

const undecodable = "delegatecall" as const;

function walkBatch(
	c: Collector,
	calls: readonly { to: Address; data: Hex }[],
	label: string,
	depth: number,
) {
	calls.forEach((call, i) => {
		walkCall(c, call.to, call.data, 0, `${label} call ${i + 1}`, depth + 1);
	});
}

function walkExecutionMode(
	c: Collector,
	to: Address,
	args: readonly unknown[],
	label: string,
	depth: number,
) {
	const mode = args[0] as Hex;
	const body = args[1] as Hex;
	const callType = hexToNumber(slice(mode, 0, 1));
	try {
		if (callType === 0 || callType === 0xff) {
			if (size(body) < 20) throw new Error("short");
			const target = getAddress(slice(body, 0, 20));
			const from = callType === 0 ? 52 : 20;
			const inner: Hex = size(body) > from ? slice(body, from) : "0x";
			walkCall(c, target, inner, callType === 0xff ? 1 : 0, label, depth + 1);
			return;
		}
		if (callType === 1) {
			const withOpData = hexToNumber(slice(mode, 6, 10)) !== 0;
			walkBatch(c, decodeCallList(body, withOpData), label, depth);
			return;
		}
	} catch {}
	add(c, to, undecodable, `undecodable ${label}`);
}

function decodeCallList(
	body: Hex,
	withOpData: boolean,
): { to: Address; data: Hex }[] {
	const params = withOpData
		? [...executionListParams, { type: "bytes" } as const]
		: executionListParams;
	const [list] = decodeAbiParameters(params, body);
	return list as { to: Address; data: Hex }[];
}

function walkSafeAdmin(c: Collector, data: Hex) {
	const admin = tryDecode(safeAdminAbi, data);
	if (!admin) return;
	const argIndex = admin.functionName === "swapOwner" ? 2 : 0;
	const target = admin.args[argIndex] as Address;
	add(
		c,
		target,
		"delegatecall",
		safeAdminVia[admin.functionName] ?? "Safe change",
	);
}

function walkHandover(c: Collector, to: Address, data: Hex, depth: number) {
	const handover = tryDecode(handoverAbi, data);
	if (handover) {
		const module =
			handover.functionName === "installModule"
				? (handover.args[1] as Address)
				: (handover.args[0] as Address);
		add(
			c,
			module,
			"delegatecall",
			handoverVia[handover.functionName] ?? "control handover",
		);
		return true;
	}
	const moduleExec = tryDecode(safeModuleExecAbi, data);
	if (moduleExec) {
		const [innerTo, , innerData, innerOp] = moduleExec.args as [
			Address,
			bigint,
			Hex,
			number,
		];
		walkCall(
			c,
			innerTo,
			innerData,
			Number(innerOp),
			"Safe module execution",
			depth + 1,
		);
		return true;
	}
	const factory = tryDecode(safeProxyFactoryAbi, data);
	if (factory) {
		const [singleton, initializer] = factory.args as [Address, Hex];
		add(c, singleton, "delegatecall", "Safe singleton for a new Safe");
		walkSafeSetup(c, to, initializer, depth);
		return true;
	}
	return false;
}

function walkSafeSetup(
	c: Collector,
	factory: Address,
	initializer: Hex,
	depth: number,
) {
	if (!selectorOf(initializer)) return;
	const setup = tryDecode(safeSetupAbi, initializer);
	if (!setup) {
		add(c, factory, undecodable, "undecodable Safe initializer");
		return;
	}
	const [, , to, data, fallbackHandler] = setup.args as [
		Address[],
		bigint,
		Address,
		Hex,
		Address,
	];
	walkCall(c, to, data, 1, "Safe setup delegatecall", depth + 1);
	add(c, fallbackHandler, "delegatecall", "Safe fallback handler being set");
}

function walkCall(
	c: Collector,
	to: Address,
	data: Hex | undefined,
	operation: number,
	label: string,
	depth: number,
) {
	const selector = selectorOf(data);
	if (!data || !selector) {
		add(c, to, roleFor(operation), label);
		return;
	}
	if (depth >= maxDepth) {
		add(c, to, undecodable, "undecodable: nesting too deep");
		return;
	}
	if (isMultiSend(to)) {
		const decoded = tryDecode(multiSendAbi, data);
		if (decoded) {
			let inner: InnerCall[];
			try {
				inner = unpackMultiSend(decoded.args[0] as Hex);
			} catch {
				add(c, to, undecodable, "undecodable MultiSend");
				return;
			}
			inner.forEach((call, i) => {
				walkCall(
					c,
					call.to,
					call.data,
					call.operation,
					`MultiSend call ${i + 1}`,
					depth + 1,
				);
			});
			return;
		}
	}
	const isSelf =
		c.from !== undefined && to.toLowerCase() === c.from.toLowerCase();
	const batch = tryDecode(executeAbi, data);
	if (!(isSelf && batch)) add(c, to, roleFor(operation), label);
	walkSafeAdmin(c, data);
	if (walkHandover(c, to, data, depth)) return;
	const safe = tryDecode(safeAbi, data);
	if (safe) {
		const [innerTo, , innerData, innerOp] = safe.args as [
			Address,
			bigint,
			Hex,
			number,
		];
		walkCall(
			c,
			innerTo,
			innerData,
			Number(innerOp),
			"Safe execTransaction",
			depth + 1,
		);
		return;
	}
	if (batch) {
		if (batch.functionName === "execute" && batch.args.length === 1) {
			const one = batch.args[0] as { target: Address; callData: Hex };
			walkCall(c, one.target, one.callData, 0, "account execute", depth + 1);
		} else {
			walkExecutionMode(c, to, batch.args, "batch", depth);
		}
		return;
	}
	const erc = tryDecode(erc20ApprovalAbi, data);
	if (erc) {
		const what =
			erc.functionName === "setApprovalForAll" ? "operator" : "spender";
		add(
			c,
			spenderOf(erc.args),
			"approval-spender",
			`${erc.functionName} ${what}`,
		);
		return;
	}
	if (to.toLowerCase() === permit2Address) {
		const p2 = tryDecode(permit2Abi, data);
		if (p2?.functionName === "approve") {
			add(
				c,
				p2.args[1] as Address,
				"approval-spender",
				"Permit2 approve spender",
			);
		} else if (p2?.functionName === "permit") {
			const body = p2.args[1] as { spender: Address };
			add(c, body.spender, "permit-spender", "Permit2 permit spender");
		}
	}
}

export function collectCall(
	c: Collector,
	to: Address,
	data: Hex | undefined,
	operation: number,
	label: string,
) {
	walkCall(c, to, data, operation, label, 0);
}

export function newCollector(chainId: number, from?: Address): Collector {
	return { out: [], chainId, from };
}
