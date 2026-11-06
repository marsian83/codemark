import { revokedLine, verifiedLine } from "../verdicts";

export type StageId = "live" | "cut" | "migrated";

export type Stage = {
	id: StageId;
	command: string;
	result: string;
	action: string;
	keyName: string;
	wallet: string;
};

export const stages: Stage[] = [
	{
		id: "live",
		command: "$ bun cli publish pwnmeswap.eth ci-1 --component router",
		result: "ci-1 is live. 2 releases verify",
		action: "Cut ci-1",
		keyName: "ci-1",
		wallet: verifiedLine,
	},
	{
		id: "cut",
		command: '$ bun cli cut pwnmeswap.eth ci-1 --reason "CI key leaked"',
		result: "ci-1 cut. None of its releases verify now",
		action: "Mount ci-2",
		keyName: "ci-1",
		wallet: revokedLine,
	},
	{
		id: "migrated",
		command: "$ bun cli migrate pwnmeswap.eth ci-1 ci-2 --ci 0x…",
		result: "ci-2 is live. 2 releases verify again",
		action: "Start over",
		keyName: "ci-2",
		wallet: verifiedLine.replace("ci-1", "ci-2"),
	},
];
