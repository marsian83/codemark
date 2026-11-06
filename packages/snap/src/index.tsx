import {
	targetsFromTransaction,
	targetsFromTypedData,
} from "@codemark/shared/decode";
import {
	parsePublisherName,
	resolvePubRegistry,
} from "@codemark/shared/ens/publisher";
import type {
	Json,
	OnRpcRequestHandler,
	OnSignatureHandler,
	OnTransactionHandler,
} from "@metamask/snaps-sdk";
import { MethodNotFoundError } from "@metamask/snaps-sdk";
import type { Address, Hex, TypedDataDefinition } from "viem";
import { allowedOrigins } from "./origins";
import { PinConfirm, UnpinConfirm } from "./render";
import { review } from "./review";
import { createSnapEnsClient } from "./rpc";
import { loadState, updatePins } from "./state";

function numericChain(caip: string) {
	const id = Number(caip.split(":")[1]);
	return Number.isFinite(id) ? id : 0;
}

function authorizationsOf(transaction: unknown) {
	const list = (transaction as { authorizationList?: unknown })
		.authorizationList;
	if (!Array.isArray(list)) return undefined;
	return list
		.map((a) => ({
			address: (a?.address ?? a?.contractAddress) as Address,
			chainId: Number(a?.chainId ?? 0),
		}))
		.filter((a) => typeof a.address === "string");
}

function bigOrUndefined(v: unknown) {
	try {
		return typeof v === "string" || typeof v === "number"
			? BigInt(v)
			: undefined;
	} catch {
		return undefined;
	}
}

export const onTransaction: OnTransactionHandler = async ({
	transaction,
	chainId,
}) => {
	const targets = targetsFromTransaction({
		from: transaction.from as Address,
		to: (transaction.to as Address | undefined) ?? null,
		data: transaction.data as Hex | undefined,
		authorizationList: authorizationsOf(transaction),
		value: bigOrUndefined(transaction.value),
		chainId: numericChain(chainId),
	});
	return review(targets);
};

export const onSignature: OnSignatureHandler = async ({ signature }) => {
	let typed: unknown = signature.data;
	if (typeof typed === "string") {
		try {
			typed = JSON.parse(typed);
		} catch {
			return null;
		}
	}
	if (!typed || typeof typed !== "object" || !("primaryType" in typed)) {
		return null;
	}
	const chain = Number(await ethereum.request({ method: "eth_chainId" }));
	const targets = targetsFromTypedData(typed as TypedDataDefinition, chain);
	return review(targets);
};

type PinParams = { name?: unknown };

export const onRpcRequest: OnRpcRequestHandler = async ({
	origin,
	request,
}) => {
	if (!allowedOrigins().includes(origin)) {
		throw new Error(`Origin ${origin} may not use Codemark`);
	}
	const out = (v: Record<string, unknown> | unknown[]) => v as Json;
	switch (request.method) {
		case "codemark_pins": {
			const state = await loadState();
			return out(
				state.pins.map(({ name, pubRegistry, pinnedAt }) => ({
					name,
					pubRegistry,
					pinnedAt,
				})),
			);
		}
		case "codemark_pin": {
			const name = parsePublisherName((request.params as PinParams)?.name);
			const registry = await resolvePubRegistry(createSnapEnsClient(), name);
			const existing = (await loadState()).pins.find((p) => p.name === name);
			const accepted = await snap.request({
				method: "snap_dialog",
				params: {
					type: "confirmation",
					content: (
						<PinConfirm
							name={name}
							registry={registry}
							previous={existing?.pubRegistry}
						/>
					),
				},
			});
			if (accepted !== true) return out({ pinned: false });
			await updatePins((pins) => [
				...pins.filter((p) => p.name !== name),
				{ name, pubRegistry: registry, pinnedAt: Date.now() },
			]);
			return out({ pinned: true, name, pubRegistry: registry });
		}
		case "codemark_unpin": {
			const name = parsePublisherName((request.params as PinParams)?.name);
			const state = await loadState();
			if (!state.pins.some((p) => p.name === name))
				return out({ unpinned: false });
			const accepted = await snap.request({
				method: "snap_dialog",
				params: { type: "confirmation", content: <UnpinConfirm name={name} /> },
			});
			if (accepted !== true) return out({ unpinned: false });
			await updatePins((pins) => pins.filter((p) => p.name !== name));
			return out({ unpinned: true });
		}
		default:
			throw new MethodNotFoundError({ method: request.method });
	}
};
