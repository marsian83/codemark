import { z } from "zod";
import { parsePins } from "./pins";

export const env = z
	.object({
		SEPOLIA_RPC_URL: z.string().url().optional(),
		ARKIV_ACCESS_KEY: z.string().default(""),
		CODEMARK_PINS: z.string().default("").transform(parsePins),
	})
	.parse(process.env);
