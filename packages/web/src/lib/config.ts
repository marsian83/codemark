import { defaultThresholds } from "@codemark/shared/check/severity";
import { sepolia } from "@codemark/shared/ens/addresses";
import { isAddress } from "viem";

const env = import.meta.env;

function defaultPin() {
	const name = env.VITE_DEFAULT_PIN_NAME || "pwnmeswap.eth";
	const pubRegistry =
		env.VITE_DEFAULT_PIN_REGISTRY ||
		(name === "pwnmeswap.eth"
			? "0x8a8d97f3F4d1235c62aE61cDB3644f574162d204"
			: "");
	return isAddress(pubRegistry) ? { name, pubRegistry } : undefined;
}

export const config = {
	chainId: sepolia.chainId,
	sepoliaRpc: env.VITE_SEPOLIA_RPC_URL || undefined,
	anvilRpc: env.VITE_ANVIL_RPC_URL || "http://127.0.0.1:8545",
	arkivAccessKey: env.VITE_ARKIV_ACCESS_KEY || "",
	thresholds: defaultThresholds,
	defaultPin: defaultPin(),
	snapId:
		env.VITE_SNAP_ID ||
		(env.DEV ? "local:http://localhost:8080" : "npm:@marsian83/codemark-snap"),
	ensExplorerUrl: (
		env.VITE_ENS_EXPLORER_URL || "https://explorer.ens.domains"
	).replace(/\/$/, ""),
	repoUrl: env.VITE_REPO_URL || "https://github.com/marsian83/codemark",
	demoDelegate: env.VITE_DEMO_DELEGATE || "",
	demoSweeper: env.VITE_DEMO_SWEEPER || "",
	anvilAccountKey:
		env.VITE_ANVIL_ACCOUNT_KEY ||
		"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
};
