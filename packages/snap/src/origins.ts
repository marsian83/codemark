declare const process: { env: { CODEMARK_SITE_ORIGIN?: string } };

const builtIn = ["https://codemark.hetairoi.xyz", "http://localhost:3020"];

export function allowedOrigins(): string[] {
	const site = process.env.CODEMARK_SITE_ORIGIN;
	return site ? [...builtIn, site] : builtIn;
}
