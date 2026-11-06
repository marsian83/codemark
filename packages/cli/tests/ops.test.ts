import { describe, expect, test } from "bun:test";
import { versionLabel } from "@codemark/shared/check/binding";
import { permissionedResolverAbi } from "@codemark/shared/ens/abi";
import { dnsEncode } from "@codemark/shared/ens/resolve";
import { recordKey, sepoliaCoinType } from "@codemark/shared/record";
import { decodeFunctionData } from "viem";
import { requireArgs } from "../lib/flags";
import { toJson } from "../lib/json";
import { releaseRecordCalls } from "../lib/records";
import { requireSigner, signersFromKeys } from "../lib/signers";
import { normalizePublishOptions } from "../ops/publish";

const target = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" as const;

describe("cli ops", () => {
	test("release labels follow <component>-<maj>-<min>-<patch>", () => {
		expect(versionLabel("router", "3.1.0")).toBe("router-3-1-0");
	});

	test("a command without its signer fails before sending", () => {
		const signers = signersFromKeys({ ci: undefined }, "http://127.0.0.1:1");
		expect(() => requireSigner(signers, "sec")).toThrow(/sec signer/);
	});

	test("release resolver init writes addr and codemark text for both names", () => {
		const names = [
			"router-3-1-0.ci-1.acme.eth",
			"a-0123456789ab.ci-1.acme.eth",
		];
		const calls = releaseRecordCalls(names, "v1;k=contract", target);
		expect(calls).toHaveLength(4);
		const decoded = calls.map((data) =>
			decodeFunctionData({ abi: permissionedResolverAbi, data }),
		);
		expect(decoded[0]?.functionName).toBe("setAddress");
		expect(decoded[0]?.args).toEqual([
			dnsEncode(names[0] as string),
			BigInt(sepoliaCoinType),
			target.toLowerCase() as `0x${string}`,
		]);
		expect(decoded[3]?.functionName).toBe("setText");
		expect(decoded[3]?.args?.[1]).toBe(recordKey);
	});

	test("usage errors name the missing arguments", () => {
		expect(() => requireArgs(["acme.eth"], ["publisher", "key"])).toThrow(
			"usage: <publisher> <key>",
		);
	});

	test("json output keeps bigints", () => {
		expect(toJson({ block: 12n })).toContain('"12"');
	});
});

describe("cli input normalisation", () => {
	test("publish options are normalised before anything is sent", () => {
		const options = normalizePublishOptions({
			publisher: "AcmeSwap.ETH",
			key: "CI-1",
			component: "Router",
			version: " 3.1.0 ",
			kind: "contract",
			target,
			commit: "07E55A05A1B2C3D4E5F60718293A4B5C6D7E8F90",
		});
		expect(options.publisher).toBe("acmeswap.eth");
		expect(options.key).toBe("ci-1");
		expect(options.component).toBe("router");
		expect(options.version).toBe("3.1.0");
		expect(options.commit).toBe("07e55a05a1b2c3d4e5f60718293a4b5c6d7e8f90");
		expect(
			normalizePublishOptions({ ...options, commit: undefined }).commit,
		).toBeUndefined();
	});

	test("non-normalisable input is refused", () => {
		const base = {
			publisher: "acmeswap.eth",
			key: "ci-1",
			component: "router",
			version: "3.1.0",
			kind: "contract" as const,
			target,
			commit: "07e55a05a1b2c3d4e5f60718293a4b5c6d7e8f90",
		};
		expect(() => normalizePublishOptions({ ...base, key: "ci_1" })).toThrow();
		expect(() =>
			normalizePublishOptions({ ...base, publisher: "xn--bad.eth" }),
		).toThrow();
	});
});
