import type { Address } from "viem";

export const sepoliaTargets = {
	router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
	weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
	portalProxy: "0x16Fc5058F25648194471939df75CF27A2fdC48BC",
	delegate: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
	systemConfigProxy: "0x034edD2A225f7f429A63E0f1D2084B9E0A93b538",
} as const satisfies Record<string, Address>;
