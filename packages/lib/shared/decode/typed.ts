import type { Address, Hex, TypedDataDefinition } from "viem";
import type { Target } from "../check/types";
import { add, collectCall, newCollector } from "./calldata";

type Message = Record<string, unknown>;

function isAddress(v: unknown): v is Address {
	return typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
}

export function targetsFromTypedData(
	typed: TypedDataDefinition,
	chainId: number,
): Target[] {
	const domain = (typed.domain ?? {}) as { chainId?: number | bigint | string };
	const domainChain =
		domain.chainId === undefined ? chainId : Number(domain.chainId);
	const c = newCollector(Number.isFinite(domainChain) ? domainChain : chainId);
	const message = (typed.message ?? {}) as Message;
	const primary = String(typed.primaryType);
	const spender = message.spender;
	if (isAddress(spender)) {
		if (primary === "Permit")
			add(c, spender, "permit-spender", "Permit spender");
		else if (primary.startsWith("Permit"))
			add(c, spender, "permit-spender", `Permit2 ${primary} spender`);
	}
	if (primary === "SafeTx" && isAddress(message.to)) {
		const data =
			typeof message.data === "string" ? (message.data as Hex) : undefined;
		collectCall(c, message.to, data, Number(message.operation), "SafeTx");
	}
	return c.out;
}
