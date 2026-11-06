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

export const cliLine = "$ bunx @marsian83/codemark-cli \\";

export const stages: Stage[] = [
	{
		id: "live",
		command: "  publish pwnmeswap.eth ci-1 --component router",
		result: "ci-1 is live. 2 releases verify",
		action: "Cut ci-1",
		keyName: "ci-1",
		wallet: verifiedLine,
	},
	{
		id: "cut",
		command: '  cut pwnmeswap.eth ci-1 --reason "CI key leaked"',
		result: "ci-1 cut. None of its releases verify now",
		action: "Mount ci-2",
		keyName: "ci-1",
		wallet: revokedLine,
	},
	{
		id: "migrated",
		command: "  migrate pwnmeswap.eth ci-1 ci-2 --ci 0x…",
		result: "ci-2 is live. 2 releases verify again",
		action: "Start over",
		keyName: "ci-2",
		wallet: verifiedLine.replace("ci-1", "ci-2"),
	},
];
