import { addr, defineSchema, str, u64 } from "@arkiv-network/sdk/schema";

export const arkivChainId = 0x76edaf;

export const Releases = defineSchema("codemark.release.v1", {
	artifact: str().indexed(),
	keyRegistry: addr().indexed(),
	publisher: str(),
	keyLabel: str(),
	name: str(),
	labelhash: str(),
	resolverBlock: u64(),
	regBlock: u64(),
	kind: str(),
	version: str(),
});

export const Incidents = defineSchema("codemark.incident.v1", {
	keyRegistry: addr().indexed(),
	artifact: str().indexed().optional(),
	name: str().optional(),
	action: str(),
	reason: str(),
	ensTx: str(),
	block: u64(),
	linkBlock: u64().optional(),
});
