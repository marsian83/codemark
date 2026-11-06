import { userRegistryAbi } from "@codemark/shared/ens/abi";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { labelId, normalizeLabel } from "@codemark/shared/names";
import { type Address, getAbiItem, type Hex, zeroAddress } from "viem";
import { type ArkivOutcome, writeRow } from "../lib/arkivRow";
import type { CliContext } from "../lib/context";
import { lastLog } from "../lib/logs";
import { requireSigner } from "../lib/signers";
import { send } from "../lib/tx";
import { registryOf } from "./registries";

export type CutOptions = {
	publisher: string;
	key: string;
	reason: string;
	linkBlock?: bigint;
};

export type CutResult = {
	pubRegistry: Address;
	keyRegistry: Address;
	key: string;
	tokenId: bigint;
	ensTx: Hex;
	block: bigint;
	linkBlock?: bigint;
	arkiv: ArkivOutcome;
};

export async function cut(
	ctx: CliContext,
	options: CutOptions,
): Promise<CutResult> {
	options = {
		...options,
		publisher: parsePublisherName(options.publisher),
		key: normalizeLabel(options.key),
	};
	const sec = requireSigner(ctx.signers, "sec");
	const pc = ctx.ens.publicClient;
	const pubRegistry = await registryOf(ctx, options.publisher);
	const keyRegistry = await pc.readContract({
		address: pubRegistry,
		abi: userRegistryAbi,
		functionName: "getSubregistry",
		args: [options.key],
	});
	if (keyRegistry === zeroAddress)
		throw new Error(`${options.key}.${options.publisher} is not live`);
	const tokenId = await pc.readContract({
		address: pubRegistry,
		abi: userRegistryAbi,
		functionName: "getTokenId",
		args: [labelId(options.key)],
	});
	const sent = await send(ctx, sec, {
		address: pubRegistry,
		abi: userRegistryAbi,
		functionName: "unregister",
		args: [tokenId],
	});
	ctx.log(`cut ${options.key}.${options.publisher} in ${sent.hash}`);

	const linkBlock =
		options.linkBlock ??
		(await findLinkBlock(ctx, pubRegistry, keyRegistry, sent.block));
	const result = {
		pubRegistry,
		keyRegistry,
		key: options.key,
		tokenId,
		ensTx: sent.hash,
		block: sent.block,
		linkBlock,
	};
	const row = {
		action: "cut" as const,
		keyRegistry,
		name: `${options.key}.${options.publisher}`,
		reason: options.reason,
		ensTx: sent.hash,
		block: sent.block,
		linkBlock,
	};
	const arkiv: ArkivOutcome =
		linkBlock === undefined
			? {
					status: "failed",
					reason:
						"no SubregistryUpdated log linking this key registry was found; set row.linkBlock and run arkiv-retry",
					kind: "incident",
					row,
				}
			: await writeRow(ctx, { kind: "incident", row });
	return { ...result, arkiv };
}

export async function findLinkBlock(
	ctx: CliContext,
	pubRegistry: Address,
	keyRegistry: Address,
	toBlock?: bigint,
): Promise<bigint | undefined> {
	const log = await lastLog(
		ctx,
		{
			address: pubRegistry,
			event: getAbiItem({ abi: userRegistryAbi, name: "SubregistryUpdated" }),
			args: { subregistry: keyRegistry },
		},
		{ toBlock },
	);
	return log?.blockNumber;
}
