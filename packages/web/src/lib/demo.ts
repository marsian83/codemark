import type { Pin, TargetRole } from "@codemark/shared/check";
import { defaultThresholds } from "@codemark/shared/check/severity";
import type { IconName } from "../ui/Icon";

export const demoTeam: Pin = {
	name: "pwnmeswap.eth",
	pubRegistry: "0x8a8d97f3F4d1235c62aE61cDB3644f574162d204",
};

export type DemoScenario = {
	id: string;
	label: string;
	hint: string;
	address: `0x${string}`;
	role: TargetRole;
	pins: Pin[];
	icon: IconName;
};

const router = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";

export const demoScenarios: DemoScenario[] = [
	{
		id: "router",
		icon: "shield-check",
		label: "Router 3.1.0",
		hint: "A release from a team you trust",
		address: router,
		role: "call",
		pins: [demoTeam],
	},
	{
		id: "portal",
		icon: "stack",
		label: "Portal 2.0.0",
		hint: "A proxy and the code behind it",
		address: "0x16Fc5058F25648194471939df75CF27A2fdC48BC",
		role: "call",
		pins: [demoTeam],
	},
	{
		id: "withdrawn",
		icon: "shield-x",
		label: "Withdrawn 1.0.0",
		hint: "The team pulled this release and said why",
		address: "0x65aF9C81B6351c61F3657D47Ef29AEA319B7DAE5",
		role: "call",
		pins: [demoTeam],
	},
	{
		id: "not-pinned",
		icon: "pin-off",
		label: "Router, nobody pinned",
		hint: "The same router, no team trusted",
		address: router,
		role: "call",
		pins: [],
	},
	{
		id: "unreleased",
		icon: "help",
		label: "Sepolia WETH",
		hint: "A real contract that no team released",
		address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
		role: "call",
		pins: [demoTeam],
	},
];

export const demoUpgradeContracts: {
	label: string;
	detail: string;
	address: `0x${string}`;
	icon: IconName;
}[] = [
	{
		label: "Sample delegate",
		detail: "Released by pwnmeswap.eth",
		address: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
		icon: "shield-check",
	},
	{
		label: "Sweeper",
		detail: "A real contract no team released",
		address: "0xFf0BDCD00357EaCf612ddc449aA590b90215a013",
		icon: "shield-x",
	},
];

export const demoUpgradeThresholds = {
	...defaultThresholds,
	delegateMinAgeSeconds: 3600,
};
