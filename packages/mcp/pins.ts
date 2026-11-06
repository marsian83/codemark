import type { Pin } from "@codemark/shared/check/types";
import { parsePublisherName } from "@codemark/shared/ens/publisher";
import { type Address, isAddress } from "viem";

export function parsePins(text: string): Pin[] {
	return text
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [name, pubRegistry, ...rest] = entry.split("=");
			if (
				!name ||
				!pubRegistry ||
				rest.length > 0 ||
				!isAddress(pubRegistry, { strict: false })
			)
				throw new Error(
					`CODEMARK_PINS entry "${entry}" must look like name.eth=0xRegistry. Run "bunx @marsian/codemark-mcp pin name.eth" to get it.`,
				);
			return {
				name: parsePublisherName(name),
				pubRegistry: pubRegistry as Address,
			};
		});
}
