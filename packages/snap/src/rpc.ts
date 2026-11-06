import { createEnsClient, type EnsClient } from "@codemark/shared/ens/client";

export function createSnapEnsClient(): EnsClient {
	return createEnsClient();
}
