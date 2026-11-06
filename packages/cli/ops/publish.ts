import { codeProblem, versionLabel } from "@codemark/shared/check/binding";
import { erc1967BeaconSlot } from "@codemark/shared/check/chain";
import {
	erc1967ImplementationSlot,
	userRegistryAbi,
	verifiableFactoryAbi,
} from "@codemark/shared/ens/abi";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { readAddr, readText } from "@codemark/shared/ens/resolve";
import {
	hasRole,
	registryRoles,
	releaseResolverRootRoles,
} from "@codemark/shared/ens/roles";
import {
	type ArtifactId,
	contractArtifact,
	forwardLabel,
	labelId,
	normalizeLabel,
	releaseName,
} from "@codemark/shared/names";
import {
	formatRecord,
	type ReleaseKind,
	type ReleaseRecord,
	recordKey,
	releaseRecordSchema,
	sepoliaCoinType,
} from "@codemark/shared/record";
import {
	type Address,
	encodeFunctionData,
	getAbiItem,
	getAddress,
	type Hex,
	isAddressEqual,
	keccak256,
	labelhash,
	parseEventLogs,
	size,
	zeroAddress,
} from "viem";
import { type ArkivOutcome, writeRow } from "../lib/arkivRow";
import type { CliContext } from "../lib/context";
import { deployResolver, saltFor } from "../lib/factory";
import { lastLog } from "../lib/logs";
import { releaseRecordCalls } from "../lib/records";
import { requireRoot } from "../lib/root";
import { requireSigner } from "../lib/signers";
import { type Sent, sendTogether } from "../lib/tx";
import { expiryOf, publisherRoot, registryOf } from "./registries";

export type PublishOptions = {
	publisher: string;
	key: string;
	component: string;
	version: string;
	kind: Exclude<ReleaseKind, "web">;
	target: Address;
	commit?: string;
};

export type { ArkivOutcome } from "../lib/arkivRow";

export type PublishResult = {
	publisher: string;
	key: string;
	kind: PublishOptions["kind"];
	component: string;
	version: string;
	target: Address;
	artifact: ArtifactId;
	record: string;
	recordFields: ReleaseRecord;
	label: string;
	name: string;
	labelhash: Hex;
	forwardLabel: string;
	forwardName: string;
	keyRegistry: Address;
	root: Address;
	signer: Address;
	resolver: Address;
	resolverBlock: bigint;
	regBlock: bigint;
	forwardRegBlock: bigint;
	tokenId: bigint;
	forwardTokenId: bigint;
	expiry: bigint;
	resumed: boolean;
	txs: { resolver?: Hex; register?: Hex; registerForward: Hex };
	arkiv: ArkivOutcome;
};

export async function publish(
	ctx: CliContext,
	options: PublishOptions,
): Promise<PublishResult> {
	options = normalizePublishOptions(options);
	const signer = requireSigner(
		ctx.signers,
		options.kind === "delegate" ? "root" : "ci",
	);
	const pc = ctx.ens.publicClient;
	const chainId = ctx.ens.deployment.chainId;
	const target = getAddress(options.target);
	const label = versionLabel(options.component, options.version);
	if (!label)
		throw new Error(
			`${options.component}@${options.version} is not <component>@<maj>.<min>.<patch>`,
		);
	const artifact = contractArtifact(chainId, target);
	const fwd = forwardLabel(artifact);
	const keyName = `${options.key}.${options.publisher}`;
	const name = releaseName(options.publisher, options.key, label);
	const forwardName = releaseName(options.publisher, options.key, fwd);

	const [code, slot, beaconSlot] = await Promise.all([
		pc.getCode({ address: target }),
		pc.getStorageAt({ address: target, slot: erc1967ImplementationSlot }),
		pc.getStorageAt({ address: target, slot: erc1967BeaconSlot }),
	]);
	if (!code || code === "0x") throw new Error(`${target} has no code`);
	const slotAddress = (value: Hex | undefined) =>
		value && BigInt(value) !== 0n
			? getAddress(`0x${value.slice(-40)}`)
			: undefined;
	const implementation = slotAddress(slot);
	const implementationCode = implementation
		? await pc.getCode({ address: implementation })
		: undefined;

	const recordFields = releaseRecordSchema.parse({
		kind: options.kind,
		component: options.component,
		chainId,
		codehash: keccak256(code),
		version: options.version,
		commit: options.commit,
		implementation: implementation?.toLowerCase(),
		implementationCodehash: implementationCode
			? keccak256(implementationCode)
			: undefined,
	});
	const record = formatRecord(recordFields);

	const [pubRegistry, keyRegistry, root] = await Promise.all([
		registryOf(ctx, options.publisher),
		registryOf(ctx, keyName),
		publisherRoot(ctx, options.publisher),
	]);
	const [rootRegistrar, counts, signerRoles] = await Promise.all([
		pc.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "hasRootRoles",
			args: [registryRoles.ROLE_REGISTRAR, root],
		}),
		pc.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "roleCount",
			args: [0n],
		}),
		pc.readContract({
			address: keyRegistry,
			abi: userRegistryAbi,
			functionName: "roles",
			args: [0n, signer.account.address],
		}),
	]);
	const problem = publishProblem({
		record: recordFields,
		facts: {
			delegated: code.toLowerCase().startsWith("0xef0100"),
			beacon: slotAddress(beaconSlot),
			codeHash: keccak256(code),
			implementation,
			implementationCodeHash: implementationCode
				? keccak256(implementationCode)
				: undefined,
		},
		soleRootRegistrar: rootRegistrar && (counts & 0xfn) === 1n,
		signerCanPull:
			options.kind !== "delegate" &&
			hasRole(signerRoles, registryRoles.ROLE_REGISTRAR) &&
			hasRole(signerRoles, registryRoles.ROLE_UNREGISTER),
	});
	if (problem) throw new Error(`${problem}; nothing was sent`);

	const expiry = await expiryOf(ctx, pubRegistry, options.key);
	const stateOf = async (l: string): Promise<RegistrationState> => {
		const id = labelId(l);
		const [status, tokenId, labelExpiry, labelResolver] = await Promise.all([
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getStatus",
				args: [id],
			}),
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getTokenId",
				args: [id],
			}),
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getExpiry",
				args: [id],
			}),
			pc.readContract({
				address: keyRegistry,
				abi: userRegistryAbi,
				functionName: "getResolver",
				args: [l],
			}),
		]);
		return { status, tokenId, expiry: labelExpiry, resolver: labelResolver };
	};
	const [releaseState, forwardState] = await Promise.all([
		stateOf(label),
		stateOf(fwd),
	]);
	const resumable =
		releaseState.status === 2 &&
		(await sameRelease(ctx, releaseState.resolver, name, record, target));
	const plan = planRegistration({
		name,
		forwardName,
		key: options.key,
		release: releaseState,
		forward: forwardState,
		resumable,
	});

	const resolver = plan.deploy
		? await deployResolver(
				ctx,
				signer,
				[{ account: root, roleBitmap: releaseResolverRootRoles }],
				releaseRecordCalls([name, forwardName], record, target),
				saltFor(name),
			)
		: { address: releaseState.resolver, block: 0n, hash: undefined };
	if (plan.deploy) ctx.log(`release resolver ${resolver.address}`);
	else ctx.log(`resuming ${name}: registering only ${forwardName}`);

	const registerCall = (l: string) => ({
		address: keyRegistry,
		abi: userRegistryAbi,
		functionName: "register",
		args: [l, root, zeroAddress, resolver.address, 0n, expiry],
	});
	const labels = plan.register.map((which) =>
		which === "release" ? label : fwd,
	);
	let sent: Sent[];
	try {
		sent =
			options.kind === "delegate"
				? await registerAsRoot(ctx, labels.map(registerCall))
				: await sendTogether(ctx, signer, labels.map(registerCall));
	} catch (error) {
		const after = await Promise.all([stateOf(label), stateOf(fwd)]);
		const done = [name, forwardName].filter((_, i) => after[i]?.status === 2);
		throw new Error(
			`${error instanceof Error ? error.message.split("\n")[0] : String(error)}; registered so far: ${done.join(", ") || "none"} (resolver ${resolver.address}); re-run publish to register the rest`,
		);
	}
	const release = plan.register.includes("release") ? sent[0] : undefined;
	const forward = sent[sent.length - 1];
	if (!forward) throw new Error("register did not complete");
	const tokenOf = (receipt: Sent["receipt"], l: string) =>
		parseEventLogs({
			abi: userRegistryAbi,
			eventName: "LabelRegistered",
			logs: receipt.logs,
		}).find((log) => log.args.label === l)?.args.tokenId ?? 0n;
	const earlier = release
		? undefined
		: await resumedBlocks(ctx, keyRegistry, label, resolver.address);
	ctx.log(
		`registered ${labels.map((l) => releaseName(options.publisher, options.key, l)).join(" and ")}`,
	);

	const base = {
		publisher: options.publisher,
		key: options.key,
		kind: options.kind,
		component: options.component,
		version: options.version,
		target,
		artifact,
		record,
		recordFields,
		label,
		name,
		labelhash: `0x${labelId(label).toString(16).padStart(64, "0")}` as Hex,
		forwardLabel: fwd,
		forwardName,
		keyRegistry,
		root,
		signer: signer.account.address,
		resolver: resolver.address,
		resolverBlock: earlier?.resolverBlock ?? resolver.block,
		regBlock: release?.block ?? earlier?.regBlock ?? 0n,
		forwardRegBlock: forward.block,
		tokenId: release
			? tokenOf(release.receipt, label)
			: (earlier?.tokenId ?? 0n),
		forwardTokenId: tokenOf(forward.receipt, fwd),
		expiry,
		resumed: !plan.deploy,
		txs: {
			resolver: resolver.hash,
			register: release?.hash,
			registerForward: forward.hash,
		},
	};
	return { ...base, arkiv: await writeReleaseRow(ctx, base) };
}

async function writeReleaseRow(
	ctx: CliContext,
	release: Omit<PublishResult, "arkiv">,
): Promise<ArkivOutcome> {
	if (release.kind === "delegate")
		return { status: "skipped", reason: "delegates have no Arkiv row" };
	return writeRow(ctx, {
		kind: "release",
		row: {
			artifact: release.artifact,
			keyRegistry: release.keyRegistry,
			publisher: release.publisher,
			keyLabel: release.key,
			name: release.name,
			labelhash: release.labelhash,
			resolverBlock: release.resolverBlock,
			regBlock: release.regBlock,
			kind: "contract",
			version: release.version,
			expiresAt: Number(release.expiry),
		},
	});
}

async function registerAsRoot(
	ctx: CliContext,
	calls: { address: Address; args: readonly unknown[] }[],
): Promise<Sent[]> {
	const sent = await requireRoot(ctx).execute(
		calls.map((c) => ({
			to: c.address,
			data: encodeFunctionData({
				abi: userRegistryAbi,
				functionName: "register",
				args: c.args as never,
			}),
		})),
	);
	return calls.map(() => sent);
}

export function normalizePublishOptions(
	options: PublishOptions,
): PublishOptions {
	return {
		...options,
		publisher: parsePublisherName(options.publisher),
		key: normalizeLabel(options.key),
		component: normalizeLabel(options.component),
		version: options.version.trim(),
		commit: options.commit?.trim().toLowerCase() || undefined,
	};
}

export type RegistrationState = {
	status: number;
	tokenId: bigint;
	expiry: bigint;
	resolver: Address;
};

export function isBurned(state: RegistrationState): boolean {
	return (
		state.status === 0 &&
		((state.tokenId & 0xffffffffn) !== 0n || state.expiry !== 0n)
	);
}

export function planRegistration(input: {
	name: string;
	forwardName: string;
	key: string;
	release: RegistrationState;
	forward: RegistrationState;
	resumable: boolean;
}): { deploy: boolean; register: ("release" | "forward")[] } {
	const { release, forward } = input;
	if (isBurned(release))
		throw new Error(
			`${input.name} was registered before and is burned (a re-registration can never verify); bump the version. Nothing was sent`,
		);
	if (isBurned(forward))
		throw new Error(
			`${input.forwardName} was registered before and is burned; this artifact cannot be published again under ${input.key}. Nothing was sent`,
		);
	if (release.status === 0 && forward.status === 0)
		return { deploy: true, register: ["release", "forward"] };
	if (
		release.status === 2 &&
		forward.status === 2 &&
		release.resolver === forward.resolver
	)
		throw new Error(`${input.name} is already published; nothing was sent`);
	if (release.status === 2 && forward.status === 0 && input.resumable)
		return { deploy: false, register: ["forward"] };
	const taken = release.status !== 0 ? input.name : input.forwardName;
	const state = (release.status !== 0 ? release : forward).status;
	throw new Error(
		`${taken} is already ${state === 1 ? "reserved" : "registered"}; nothing was sent`,
	);
}

export function publishProblem(input: {
	record: ReleaseRecord;
	facts: Parameters<typeof codeProblem>[1];
	soleRootRegistrar: boolean;
	signerCanPull: boolean;
}): string | undefined {
	const problem = codeProblem(input.record, input.facts);
	if (problem) return problem;
	if (input.record.kind === "delegate" && !input.soleRootRegistrar)
		return "a delegate must be published under a key where root is the only ROLE_REGISTRAR holder";
	if (input.signerCanPull)
		return "the publishing key also holds ROLE_UNREGISTER on this key registry; the checker rejects such releases";
	return undefined;
}

async function sameRelease(
	ctx: CliContext,
	resolver: Address,
	name: string,
	record: string,
	target: Address,
): Promise<boolean> {
	if (resolver === zeroAddress) return false;
	try {
		const [text, addr] = await Promise.all([
			readText(ctx.ens, resolver, name, recordKey),
			readAddr(ctx.ens, resolver, name, sepoliaCoinType),
		]);
		return text === record && size(addr) === 20 && isAddressEqual(addr, target);
	} catch {
		return false;
	}
}

async function resumedBlocks(
	ctx: CliContext,
	keyRegistry: Address,
	label: string,
	resolver: Address,
) {
	const [registered, deployed] = await Promise.all([
		lastLog(ctx, {
			address: keyRegistry,
			event: getAbiItem({ abi: userRegistryAbi, name: "LabelRegistered" }),
			args: { labelHash: labelhash(label) },
		}),
		lastLog(ctx, {
			address: ctx.ens.deployment.verifiableFactory,
			event: getAbiItem({ abi: verifiableFactoryAbi, name: "ProxyDeployed" }),
			args: { proxyAddress: resolver },
		}),
	]);
	return {
		regBlock: registered?.blockNumber ?? 0n,
		tokenId: registered?.args.tokenId ?? 0n,
		resolverBlock: deployed?.blockNumber ?? 0n,
	};
}
