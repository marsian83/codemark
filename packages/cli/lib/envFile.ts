import { resolve } from "node:path";

export const envFilePath = resolve(import.meta.dir, "../../../.env");

export async function setEnvValue(
	key: string,
	value: string,
	path = envFilePath,
) {
	const file = Bun.file(path);
	const text = (await file.exists()) ? await file.text() : "";
	const line = `${key}=${value}`;
	const pattern = new RegExp(`^${key}=.*$`, "m");
	const next = pattern.test(text)
		? text.replace(pattern, line)
		: `${text}${text.endsWith("\n") || text === "" ? "" : "\n"}${line}\n`;
	await Bun.write(path, next);
}
