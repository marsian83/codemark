import type { Address, Hex } from "viem";
import type { ArkivSource } from "../arkiv/rows";
import type { EnsClient } from "../ens/client";
import type { ArtifactId } from "../names";
import type { Severity, Verdict } from "../verdict";

export type TargetRole =
	| "call"
	| "delegatecall"
	| "delegation"
	| "approval-spender"
	| "permit-spender";

export type Target = {
	address: Address;
	chainId: number;
	role: TargetRole;
	via: string;
};

export type Pin = { name: string; pubRegistry: Address };

export type CheckCache = {
	get(key: string): Promise<unknown | undefined>;
	set(key: string, value: unknown): Promise<void>;
};

export type CheckDeps = {
	ens: EnsClient;
	arkiv?: ArkivSource;
	cache?: CheckCache;
	block?: bigint;
	headLag?: bigint;
	now: number;
	delegateMinAgeSeconds: number;
	freshCallAgeSeconds: number;
	logChunkBlocks?: bigint;
	scanDepthBlocks?: bigint;
	maxIndexPages?: number;
};

export type ReleaseInfo = {
	name: string;
	label: string;
	forwardName?: string;
	kind: "contract" | "delegate" | "web";
	component: string;
	version: string;
	resolver: Address;
	codeHash: Hex;
	implementation?: Address;
	registeredAt?: number;
	regBlock?: bigint;
	ageSeconds?: number;
	proven: boolean;
};

export type PublisherVerdict = {
	publisher: string;
	pinned: boolean;
	key?: string;
	keyRegistry?: Address;
	verdict: Verdict;
	release?: ReleaseInfo;
	reason?: string;
	source: "pinned" | "index";
};

export type TargetResult = {
	target: Target;
	artifact: ArtifactId;
	verdicts: PublisherVerdict[];
	severity: Severity;
	headline: string;
	block: bigint;
	indexFlooded?: boolean;
	indexIncomplete?: boolean;
	indexUnavailable?: boolean;
	skippedPublishers?: string[];
	error?: string;
};

export type CheckRequest = { targets: Target[]; pins: Pin[] };

export type CheckResult = {
	results: TargetResult[];
	severity: Severity;
	block: bigint;
};
