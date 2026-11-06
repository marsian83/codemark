import type { TargetRole } from "@codemark/shared/check";

export type Example = {
	label: string;
	detail: string;
	address: `0x${string}`;
	role: TargetRole;
};

export const examples: Example[] = [
	{
		label: "Router",
		detail: "Demo router from pwnmeswap.eth",
		address: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
		role: "call",
	},
	{
		label: "Portal proxy",
		detail: "Demo proxy and its implementation",
		address: "0x16Fc5058F25648194471939df75CF27A2fdC48BC",
		role: "call",
	},
	{
		label: "Account upgrade",
		detail: "Demo contract that would control your account",
		address: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
		role: "delegation",
	},
	{
		label: "Unreleased contract",
		detail: "Sepolia WETH, not released by any team",
		address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
		role: "call",
	},
];
