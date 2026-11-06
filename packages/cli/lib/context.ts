import type { EnsClient } from "@codemark/shared/ens/client";
import type { ArkivWriter } from "../arkiv/writer";
import type { RootExecutor } from "./root";
import type { Signers } from "./signers";

export type CliContext = {
	ens: EnsClient;
	signers: Signers;
	root?: RootExecutor;
	waitSeconds?: (seconds: number) => Promise<void>;
	sameBlock?: <T>(run: () => Promise<T>) => Promise<T>;
	arkiv?: { release?: ArkivWriter; incident?: ArkivWriter };
	log: (message: string) => void;
};
