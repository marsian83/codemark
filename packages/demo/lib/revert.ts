import { BaseError, ContractFunctionRevertedError } from "viem";

export async function revertName(run: Promise<unknown>): Promise<string> {
	try {
		await run;
	} catch (error) {
		if (error instanceof BaseError) {
			const reverted = error.walk(
				(e) => e instanceof ContractFunctionRevertedError,
			);
			if (reverted instanceof ContractFunctionRevertedError)
				return reverted.data?.errorName ?? reverted.signature ?? "reverted";
		}
		return `error: ${String(error).split("\n")[0]}`;
	}
	return "ok";
}
