import type { EnsClient } from "@codemark/shared/ens/client";
import { resolvePubRegistry } from "@codemark/shared/ens/publisher";
import type { Address } from "viem";
import { type SnapState, type StoredPin, samePin } from "./state";

export type PinStatus = "ok" | "changed" | "unknown";
export type PinCheck = { pin: StoredPin; current?: Address; status: PinStatus };

export async function verifyPins(
	ens: EnsClient,
	state: SnapState,
): Promise<PinCheck[]> {
	return Promise.all(
		state.pins.map(async (pin): Promise<PinCheck> => {
			try {
				const current = await resolvePubRegistry(ens, pin.name);
				return {
					pin,
					current,
					status: samePin(pin, current) ? "ok" : "changed",
				};
			} catch {
				return { pin, status: "unknown" };
			}
		}),
	);
}
