declare const process: { env: { CODEMARK_SITE_ORIGIN?: string } };

export function allowedOrigins(): string[] {
	const site = process.env.CODEMARK_SITE_ORIGIN;
	return ["http://localhost:3020", ...(site ? [site] : [])];
}
