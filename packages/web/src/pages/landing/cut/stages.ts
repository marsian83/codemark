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
		command: "$ bun cli publish acmeswap.eth ci-1 --component router",
		result: "ci-1: 2 releases verify",
		action: "Cut ci-1",
		keyName: "ci-1",
		wallet: verifiedLine,
	},
	{
		id: "cut",
		command: '$ bun cli cut acmeswap.eth ci-1 --reason "CI key leaked"',
		result: "ci-1: 0 releases verify, in one transaction",
		action: "Mount ci-2",
		keyName: "ci-1",
		wallet: revokedLine,
	},
	{
		id: "migrated",
		command: "$ bun cli migrate acmeswap.eth ci-1 ci-2 --ci 0x…",
		result: "ci-2: 2 releases verify",
		action: "Start over",
		keyName: "ci-2",
		wallet: verifiedLine.replace("ci-1", "ci-2"),
	},
];
