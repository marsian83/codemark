import type { Verdict } from "@codemark/shared/verdict";
import type { Tone } from "../ui/Badge";

export const verdictTone: Record<Verdict, Tone> = {
	VERIFIED: "success",
	"VERIFIED-unproven": "warning",
	"KEY REVOKED": "error",
	PULLED: "error",
	MISMATCH: "error",
	UNKNOWN: "neutral",
};
