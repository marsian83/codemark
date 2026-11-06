import type { ArkivOutcome } from "./arkivRow";
import { toJson } from "./json";

export async function report(
	action: string,
	result: { arkiv: ArkivOutcome },
	dir = process.cwd(),
) {
	console.log(toJson(result));
	if (result.arkiv.status === "skipped")
		console.error(`Arkiv row skipped: ${result.arkiv.reason}`);
	if (result.arkiv.status === "failed") {
		const file = `${dir}/codemark-pending-${action}-${Date.now()}.json`;
		await Bun.write(file, `${toJson(result)}\n`);
		console.error(
			`The chain transactions succeeded but the Arkiv row failed (${result.arkiv.reason}). Saved ${file}; run: bunx @marsian83/codemark-cli arkiv-retry ${file}`,
		);
		process.exitCode = 3;
	}
}
