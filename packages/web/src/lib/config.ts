import { defaultThresholds } from "@codemark/shared/check/severity";
import { sepolia } from "@codemark/shared/ens/addresses";
import { isAddress } from "viem";

const env = import.meta.env;

function defaultPin() {
	const name = env.VITE_DEFAULT_PIN_NAME || "acmeswap.eth";
	const pubRegistry =
		env.VITE_DEFAULT_PIN_REGISTRY ||
		(name === "acmeswap.eth"
			? "0x3360E31fF0F0A5D6ecA22AA76e810c5F550B0bEB"
			: "");
	return isAddress(pubRegistry) ? { name, pubRegistry } : undefined;
}

export const config = {
	chainId: sepolia.chainId,
	sepoliaRpc: env.VITE_SEPOLIA_RPC_URL || "https://sepolia.gateway.tenderly.co",
	anvilRpc: env.VITE_ANVIL_RPC_URL || "http://127.0.0.1:8545",
	arkivAccessKey: env.VITE_ARKIV_ACCESS_KEY || "",
	thresholds: defaultThresholds,
	defaultPin: defaultPin(),
	snapId: env.VITE_SNAP_ID || "local:http://localhost:8080",
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
