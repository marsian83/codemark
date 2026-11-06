import { defaultThresholds } from "@codemark/shared/check/severity";
import { sepolia } from "@codemark/shared/ens/addresses";

const env = import.meta.env;

export const config = {
	chainId: sepolia.chainId,
	sepoliaRpc: env.VITE_SEPOLIA_RPC_URL || undefined,
	arkivAccessKey: env.VITE_ARKIV_ACCESS_KEY || "",
	thresholds: defaultThresholds,
	snapId: env.VITE_SNAP_ID || "npm:@marsian/codemark-snap",
	ensExplorerUrl: (
		env.VITE_ENS_EXPLORER_URL || "https://explorer.ens.domains"
	).replace(/\/$/, ""),
	repoUrl: env.VITE_REPO_URL || "https://github.com/marsian83/codemark",
};
