import { readFileSync } from "node:fs";
import { isAddress } from "viem";
import { z } from "zod";
import { envFilePath } from "./lib/envFile";

export function parseEnvFile(text: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
		if (!match?.[1]) continue;
		values[match[1]] = (match[2] ?? "").replace(/^(['"])(.*)\1$/, "$2");
	}
	return values;
}

function fileValues(): Record<string, string> {
	try {
		return parseEnvFile(readFileSync(envFilePath, "utf8"));
	} catch {
		return {};
	}
}

const optionalKey = z
	.string()
	.optional()
	.transform((v) => v || undefined);

export const envSchema = z.object({
	SEPOLIA_RPC_URL: z
		.string()
		.url()
		.default("https://sepolia.gateway.tenderly.co"),
	ARKIV_ACCESS_KEY: z.string().default(""),
	CODEMARK_ROOT_KEY: optionalKey,
	CODEMARK_SEC_KEY: optionalKey,
	CODEMARK_CI_KEY: optionalKey,
	CODEMARK_SAFE: optionalKey.refine((v) => v === undefined || isAddress(v), {
		message:
			"CODEMARK_SAFE is not a valid address (bad length or EIP-55 checksum)",
	}),
});

export const env = envSchema.parse({ ...fileValues(), ...definedEnv() });

function definedEnv() {
	return Object.fromEntries(
		Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
	);
}
