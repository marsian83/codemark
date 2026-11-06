import type { SnapConfig } from "@metamask/snaps-cli";

declare const process: { env: Record<string, string | undefined> };

const config: SnapConfig = {
	input: "src/index.tsx",
	server: { port: 8080 },
	polyfills: { buffer: true },
	environment: {
		CODEMARK_SITE_ORIGIN: process.env.CODEMARK_SITE_ORIGIN ?? "",
	},
};

export default config;
