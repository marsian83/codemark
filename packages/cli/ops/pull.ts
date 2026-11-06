import { userRegistryAbi } from "@codemark/shared/ens/abi";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { readAddr } from "@codemark/shared/ens/resolve";
import {
	type ArtifactId,
	contractArtifact,
	forwardLabel,
	labelId,
	normalizeLabel,
	releaseName,
} from "@codemark/shared/names";
import { sepoliaCoinType } from "@codemark/shared/record";
import {
	type Address,
	encodeFunctionData,
	getAddress,
	type Hex,
	size,
	zeroAddress,
} from "viem";
import { type ArkivOutcome, writeRow } from "../lib/arkivRow";
import type { CliContext } from "../lib/context";
import { type BatchCall, requireRoot } from "../lib/root";
import { registryOf } from "./registries";

export const reservedExpiry = 2n ** 64n - 1n;

export type PullOptions = {
	publisher: string;
	key: string;
	label: string;
	forwardLabel?: string;
	target?: Address;
	reason: string;
};

export type PulledLabel = { label: string; name: string };

export type PullResult = {
	keyRegistry: Address;
	artifact?: ArtifactId;
	name: string;
	ensTx: Hex;
	block: bigint;
	labels: PulledLabel[];
	arkiv: ArkivOutcome;
};

export type LabelState = { status: 0 | 1 | 2; resolver: Address };

export function planPull(input: {
	label: string;
	given?: string;
	derived?: string;
	release: LabelState;
	forward?: LabelState;
}): { forward: string; pull: string[] } {
	if (!input.derived)
		throw new Error(
			`cannot derive the forward name of ${input.label}: it no longer resolves; pass --target <released address>`,
		);
	if (input.given && input.given !== input.derived)
		throw new Error(
			`--forward ${input.given} is not this release's forward name (${input.derived}); nothing was sent`,
		);
	const forward = input.forward ?? { status: 0, resolver: zeroAddress };
	if (
		input.release.status === 2 &&
		forward.status === 2 &&
		input.release.resolver !== forward.resolver
	)
		throw new Error(
			`${input.label} and ${input.derived} do not share a resolver; ${input.derived} belongs to another release, nothing was sent`,
		);
	const pull = [
		[input.label, input.release] as const,
		[input.derived, forward] as const,
	]
		.filter(([, state]) => state.status !== 1)
		.map(([label]) => label);
	if (pull.length === 0)
		throw new Error(`${input.label} and ${input.derived} are already pulled`);
	return { forward: input.derived, pull };
}

export async function pull(
	ctx: CliContext,
	options: PullOptions,
): Promise<PullResult> {
	options = {
		...options,
		publisher: parsePublisherName(options.publisher),
		key: normalizeLabel(options.key),
		label: normalizeLabel(options.label),
		forwardLabel: options.forwardLabel
			? normalizeLabel(options.forwardLabel)
			: undefined,
	};
	const root = requireRoot(ctx);
	const keyRegistry = await registryOf(
		ctx,
		`${options.key}.${options.publisher}`,
	);
	const name = releaseName(options.publisher, options.key, options.label);
	const pc = ctx.ens.publicClient;
	const stateOf = async (label: string): Promise<LabelState> => {
		const [status, resolver] = await Promise.all([
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getStatus",
				args: [labelId(label)],
			}),
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getResolver",
				args: [label],
			}),
		]);
		return { status: status as LabelState["status"], resolver };
	};
	const targetOf = async (label: string, state: LabelState) => {
		if (state.status !== 2 || state.resolver === zeroAddress) return undefined;
		const addr = await readAddr(
			ctx.ens,
			state.resolver,
			releaseName(options.publisher, options.key, label),
			sepoliaCoinType,
		);
		return size(addr) === 20 ? getAddress(addr) : undefined;
	};
	const derive = (target: Address | undefined) =>
		target
			? forwardLabel(contractArtifact(ctx.ens.deployment.chainId, target))
			: undefined;

	const release = await stateOf(options.label);
	let target = (await targetOf(options.label, release)) ?? options.target;
	if (!target && options.forwardLabel)
		target = await targetOf(
			options.forwardLabel,
			await stateOf(options.forwardLabel),
		);
	const derived = derive(target);
	const forward = derived ? await stateOf(derived) : undefined;
	const plan = planPull({
		label: options.label,
		given: options.forwardLabel,
		derived,
		release,
		forward,
	});
	const artifact = target
		? contractArtifact(ctx.ens.deployment.chainId, target)
		: undefined;

	const calls: BatchCall[] = [];
	for (const label of plan.pull) {
		const state = label === options.label ? release : (forward as LabelState);
		if (state.status === 2)
			calls.push({
				to: keyRegistry,
				data: encodeFunctionData({
					abi: userRegistryAbi,
					functionName: "unregister",
					args: [
						await pc.readContract({
							address: keyRegistry,
							abi: userRegistryAbi,
							functionName: "getTokenId",
							args: [labelId(label)],
						}),
					],
				}),
			});
		calls.push({
			to: keyRegistry,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "register",
				args: [
					label,
					zeroAddress,
					zeroAddress,
					zeroAddress,
					0n,
					reservedExpiry,
				],
			}),
		});
	}
	const pulled = plan.pull;

	const sent = await root.execute(calls);
	ctx.log(`pulled ${pulled.join(" and ")} in ${sent.hash}`);

	const result = {
		keyRegistry,
		artifact,
		name,
		ensTx: sent.hash,
		block: sent.block,
		labels: pulled.map((label) => ({
			label,
			name: releaseName(options.publisher, options.key, label),
		})),
	};
	return { ...result, arkiv: await writePullRow(ctx, result, options.reason) };
}

async function writePullRow(
	ctx: CliContext,
	pulled: Omit<PullResult, "arkiv">,
	reason: string,
): Promise<ArkivOutcome> {
	return writeRow(ctx, {
		kind: "incident",
		row: {
			action: "pull",
			keyRegistry: pulled.keyRegistry,
			artifact: pulled.artifact,
			name: pulled.name,
			reason,
			ensTx: pulled.ensTx,
			block: pulled.block,
		},
	});
}
