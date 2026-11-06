import type { Verdict } from "@codemark/shared/verdict";
import type { Tone } from "../ui/Badge";

export const verdictTone: Record<Verdict, Tone> = {
	VERIFIED: "success",
	"VERIFIED-unproven": "caution",
	"KEY REVOKED": "error",
	PULLED: "error",
	MISMATCH: "error",
	UNKNOWN: "neutral",
};
