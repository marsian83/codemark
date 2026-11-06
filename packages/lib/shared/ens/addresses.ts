import type { Address } from "viem";

export const sepolia = {
	chainId: 11155111,
	rootRegistry: "0xb458d6a3a77919449d03e7a6903c26827c1ec43f",
	ethRegistry: "0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4",
	ethRegistrar: "0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3",
	universalResolver: "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe",
	universalResolverImpl: "0x6d80F2172CFdEc5730fE683860C33d26fC42e6F1",
	verifiableFactory: "0xda70306c98e97ece36f997a21368e53298572991",
	userRegistryImpl: "0x9bd8a88719068d09ecee662f36c0e3856708366a",
	permissionedResolverImpl: "0x115eb53f0c60696633855f90b138178fb40b2b2c",
	mockUsdc: "0x240b0316df57887dbbe58b586508b19e633a14aa",
	sourceCommit: "07e55a05",
} as const satisfies Record<string, Address | number | string>;

export type EnsDeployment = typeof sepolia;
