import { type Address, type Hex, isAddress, isHex } from "viem";
import { z } from "zod";

export const releaseKinds = ["contract", "delegate", "web"] as const;
export type ReleaseKind = (typeof releaseKinds)[number];

const hex32 = z.string().regex(/^0x[0-9a-f]{64}$/);
const addr40 = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const gitSha = z.string().regex(/^[0-9a-f]{40}$/);

export const releaseRecordSchema = z.object({
	kind: z.enum(releaseKinds),
	component: z.string().min(1).max(32),
	chainId: z.number().int().positive(),
	codehash: hex32.optional(),
	version: z.string().min(1).max(32),
	commit: gitSha.optional(),
	implementation: addr40.optional(),
	implementationCodehash: hex32.optional(),
});
export type ReleaseRecord = z.infer<typeof releaseRecordSchema>;

export const recordKey = "codemark";
export const keysRecordKey = "codemark.keys";
export const sepoliaCoinType = 0x80aa36a7;

export function formatRecord(record: ReleaseRecord): string {
	const parts = [
		`v1`,
		`k=${record.kind}`,
		`n=${record.component}`,
		`c=${record.chainId}`,
	];
	if (record.codehash) parts.push(`h=${record.codehash}`);
	parts.push(`v=${record.version}`);
	if (record.commit) parts.push(`g=${record.commit}`);
	if (record.implementation) parts.push(`i=${record.implementation}`);
	if (record.implementationCodehash)
		parts.push(`ih=${record.implementationCodehash}`);
	return parts.join(";");
}

export function parseRecord(text: string): ReleaseRecord | undefined {
	const [version, ...fields] = text.split(";");
	if (version !== "v1") return undefined;
	const map = new Map<string, string>();
	for (const field of fields) {
		const eq = field.indexOf("=");
		if (eq <= 0) return undefined;
		map.set(field.slice(0, eq), field.slice(eq + 1));
	}
	const chainId = Number(map.get("c"));
	const parsed = releaseRecordSchema.safeParse({
		kind: map.get("k"),
		component: map.get("n"),
		chainId,
		codehash: map.get("h"),
		version: map.get("v"),
		commit: map.get("g"),
		implementation: map.get("i"),
		implementationCodehash: map.get("ih"),
	});
	return parsed.success ? parsed.data : undefined;
}

export function parseKeys(text: string): string[] {
	return text
		.split(",")
		.map((k) => k.trim())
		.filter((k) => k.length > 0);
}

export function isCodehash(value: string): value is Hex {
	return isHex(value) && value.length === 66;
}

export function isContractAddress(value: string): value is Address {
	return isAddress(value);
}
