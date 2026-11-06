import { sepolia } from "@codemark/shared/ens/addresses";

const env = import.meta.env;

export const config = {
	chainId: sepolia.chainId,
	sepoliaRpc:
		env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
	anvilRpc: env.VITE_ANVIL_RPC_URL || "http://127.0.0.1:8548",
	arkivAccessKey: env.VITE_ARKIV_ACCESS_KEY || "",
	delegateMinAgeSeconds: Number(env.VITE_DELEGATE_MIN_AGE_SECONDS || 86400),
	freshCallAgeSeconds: Number(env.VITE_FRESH_CALL_AGE_SECONDS || 3600),
	defaultPin: {
		name: env.VITE_DEFAULT_PIN_NAME || "",
		pubRegistry: env.VITE_DEFAULT_PIN_REGISTRY || "",
	},
	snapId: env.VITE_SNAP_ID || "local:http://localhost:8080",
	ensExplorerUrl: (
		env.VITE_ENS_EXPLORER_URL || "https://explorer.ens.domains"
	).replace(/\/$/, ""),
	exampleAddress: env.VITE_EXAMPLE_ADDRESS || "",
	repoUrl: env.VITE_REPO_URL || "",
	demoDelegate: env.VITE_DEMO_DELEGATE || "",
	demoSweeper: env.VITE_DEMO_SWEEPER || "",
	anvilAccountKey:
		env.VITE_ANVIL_ACCOUNT_KEY ||
		"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
};
