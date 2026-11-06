import { addKey } from "./addKey";
import { arkivRetry } from "./arkivRetry";
import { cut } from "./cut";
import { init } from "./init";
import { migrate } from "./migrate";
import { publish } from "./publish";
import { pull } from "./pull";
import { verify } from "./verify";

export type Command = (
	args: string[],
	flags: Record<string, unknown>,
) => Promise<void>;

export const commands: Record<string, Command> = {
	init,
	"add-key": addKey,
	publish,
	cut,
	pull,
	migrate,
	verify,
	"arkiv-retry": arkivRetry,
};
