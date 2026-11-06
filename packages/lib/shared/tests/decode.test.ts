import { describe, expect, test } from "bun:test";
import {
	concatHex,
	encodeAbiParameters,
	encodeFunctionData,
	encodePacked,
	getAddress,
	type Hex,
	numberToHex,
	parseAbi,
	toHex,
	zeroAddress,
} from "viem";
import {
	targetsFromCalls,
	targetsFromTransaction,
	targetsFromTypedData,
} from "../decode";
import {
	handoverAbi,
	multiSendAbi,
	permit2Abi,
	permit2Address,
	safeAbi,
	safeModuleExecAbi,
	safeProxyFactoryAbi,
	safeSetupAbi,
} from "../decode/abis";
import { multiSend } from "../decode/safeMultiSend";

const A = getAddress("0x1111111111111111111111111111111111111111");
const B = getAddress("0x2222222222222222222222222222222222222222");
const C = getAddress("0x3333333333333333333333333333333333333333");
const SAFE = getAddress("0x4444444444444444444444444444444444444444");
const chainId = 11155111;
const erc20 = parseAbi([
	"function approve(address spender, uint256 amount)",
	"function increaseAllowance(address spender, uint256 addedValue)",
]);

function packed(op: number, to: string, data: Hex) {
	return encodePacked(
		["uint8", "address", "uint256", "uint256", "bytes"],
		[op, to as Hex, 0n, BigInt((data.length - 2) / 2), data],
	);
}

function exec(to: string, data: Hex, operation: number) {
	return encodeFunctionData({
		abi: safeAbi,
		functionName: "execTransaction",
		args: [
			to as Hex,
			0n,
			data,
			operation,
			0n,
			0n,
			0n,
			zeroAddress,
			zeroAddress,
			"0x",
		],
	});
}

describe("transaction decoding", () => {
	test("plain call", () => {
		expect(targetsFromTransaction({ to: A, chainId })).toEqual([
			{ address: A, chainId, role: "call", via: "tx.to" },
		]);
	});

	test("erc20 approve and increaseAllowance spenders", () => {
		for (const functionName of ["approve", "increaseAllowance"] as const) {
			const data = encodeFunctionData({
				abi: erc20,
				functionName,
				args: [B, 5n],
			});
			const t = targetsFromTransaction({ to: A, data, chainId });
			expect(t.map((x) => [x.address, x.role])).toEqual([
				[A, "call"],
				[B, "approval-spender"],
			]);
			expect(t[1]?.via).toBe(`${functionName} spender`);
		}
	});

	test("permit2 approve and permit", () => {
		const approve = encodeFunctionData({
			abi: permit2Abi,
			functionName: "approve",
			args: [A, B, 1n, 2],
		});
		const t1 = targetsFromTransaction({
			to: permit2Address,
			data: approve,
			chainId,
		});
		expect(
			t1.some((x) => x.address === B && x.role === "approval-spender"),
		).toBe(true);
		const permit = encodeFunctionData({
			abi: permit2Abi,
			functionName: "permit",
			args: [
				A,
				{
					details: { token: A, amount: 1n, expiration: 2, nonce: 3 },
					spender: C,
					sigDeadline: 9n,
				},
				"0x",
			],
		});
		const t2 = targetsFromTransaction({
			to: permit2Address,
			data: permit,
			chainId,
		});
		expect(t2.some((x) => x.address === C && x.role === "permit-spender")).toBe(
			true,
		);
		const batch = encodeFunctionData({
			abi: permit2Abi,
			functionName: "permit",
			args: [
				A,
				{
					details: [{ token: A, amount: 1n, expiration: 2, nonce: 3 }],
					spender: B,
					sigDeadline: 9n,
				},
				"0x",
			],
		});
		const t3 = targetsFromTransaction({
			to: permit2Address,
			data: batch,
			chainId,
		});
		expect(t3.some((x) => x.address === B && x.role === "permit-spender")).toBe(
			true,
		);
	});

	test("safe execTransaction operation", () => {
		const call = targetsFromTransaction({
			to: SAFE,
			data: exec(A, "0x", 0),
			chainId,
		});
		expect(call).toEqual([
			{ address: SAFE, chainId, role: "call", via: "tx.to" },
			{ address: A, chainId, role: "call", via: "Safe execTransaction" },
		]);
		const dele = targetsFromTransaction({
			to: SAFE,
			data: exec(A, "0x1234", 1),
			chainId,
		});
		expect(dele.find((x) => x.address === A)?.role).toBe("delegatecall");
		expect(dele[0]?.address).toBe(SAFE);
	});

	test("multisend inner calls with operations, including inside a safe tx", () => {
		const approve = encodeFunctionData({
			abi: erc20,
			functionName: "approve",
			args: [C, 1n],
		});
		const txs = concatHex([
			packed(0, A, "0x"),
			packed(1, B, "0xdeadbeef"),
			packed(0, A, approve),
		]);
		const ms = encodeFunctionData({
			abi: multiSendAbi,
			functionName: "multiSend",
			args: [txs],
		});
		const direct = targetsFromTransaction({
			to: multiSend[0] as Hex,
			data: ms,
			chainId,
		});
		expect(direct.map((x) => [x.address, x.role, x.via])).toEqual([
			[A, "call", "MultiSend call 1"],
			[B, "delegatecall", "MultiSend call 2"],
			[C, "approval-spender", "approve spender"],
		]);
		const viaSafe = targetsFromTransaction({
			to: SAFE,
			data: exec(multiSend[0] as string, ms, 1),
			chainId,
		});
		expect(viaSafe.map((x) => x.address)).toEqual([SAFE, A, B, C]);
		expect(viaSafe.find((x) => x.address === B)?.role).toBe("delegatecall");
	});

	test("7702 authorization list", () => {
		const t = targetsFromTransaction({
			to: A,
			chainId,
			authorizationList: [{ address: B, chainId }],
		});
		expect(t.at(-1)).toEqual({
			address: B,
			chainId,
			role: "delegation",
			via: "EIP-7702 authorization",
		});
	});

	test("wallet_sendCalls batch", () => {
		const t = targetsFromCalls(
			[{ to: A }, { to: B, data: numberToHex(1) }],
			chainId,
		);
		expect(t.map((x) => x.via)).toEqual(["batch call 1", "batch call 2"]);
	});

	test("malformed multisend does not throw", () => {
		const ms = encodeFunctionData({
			abi: multiSendAbi,
			functionName: "multiSend",
			args: ["0x00"],
		});
		expect(
			targetsFromTransaction({ to: multiSend[0] as Hex, data: ms, chainId })
				.length,
		).toBe(1);
	});
});

describe("typed data decoding", () => {
	test("EIP-2612 permit", () => {
		const t = targetsFromTypedData(
			{
				domain: { chainId, verifyingContract: A },
				primaryType: "Permit",
				types: { Permit: [{ name: "spender", type: "address" }] },
				message: { spender: B },
			},
			chainId,
		);
		expect(t).toEqual([
			{ address: B, chainId, role: "permit-spender", via: "Permit spender" },
		]);
	});

	test("Permit2 single, batch, transfer", () => {
		for (const primaryType of [
			"PermitSingle",
			"PermitBatch",
			"PermitTransferFrom",
		]) {
			const t = targetsFromTypedData(
				{
					domain: { name: "Permit2", chainId },
					primaryType,
					types: {
						[primaryType]: [{ name: "spender", type: "address" }],
					} as never,
					message: { spender: C },
				},
				chainId,
			);
			expect(t[0]?.address).toBe(C);
			expect(t[0]?.role).toBe("permit-spender");
		}
	});

	test("SafeTx delegatecall", () => {
		const t = targetsFromTypedData(
			{
				domain: { chainId, verifyingContract: SAFE },
				primaryType: "SafeTx",
				types: { SafeTx: [{ name: "to", type: "address" }] },
				message: { to: A, operation: 1 },
			},
			chainId,
		);
		expect(t[0]?.role).toBe("delegatecall");
	});
});

const account = getAddress("0x5555555555555555555555555555555555555555");
const execAbi = parseAbi([
	"function execute(bytes32 mode, bytes executionCalldata)",
	"function executeFromExecutor(bytes32 mode, bytes executionCalldata)",
]);
const callList = [
	{
		type: "tuple[]",
		components: [
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "data", type: "bytes" },
		],
	},
] as const;
const batchMode = `0x01${"00".repeat(31)}` as Hex;

describe("review regressions", () => {
	test("fake safe outer address is always a target", () => {
		const t = targetsFromTransaction({
			to: C,
			data: exec(A, "0x", 0),
			chainId,
		});
		expect(t.map((x) => x.address)).toEqual([C, A]);
	});

	test("SafeTx typed data walks MultiSend inside data", () => {
		const approve = encodeFunctionData({
			abi: erc20,
			functionName: "approve",
			args: [C, 1n],
		});
		const txs = concatHex([packed(1, B, "0xdeadbeef"), packed(0, A, approve)]);
		const data = encodeFunctionData({
			abi: multiSendAbi,
			functionName: "multiSend",
			args: [txs],
		});
		const t = targetsFromTypedData(
			{
				domain: { chainId, verifyingContract: SAFE },
				primaryType: "SafeTx",
				types: { SafeTx: [{ name: "to", type: "address" }] } as never,
				message: { to: multiSend[0], data, operation: 1 },
			},
			chainId,
		);
		expect(t.find((x) => x.address === B)?.role).toBe("delegatecall");
		expect(t.find((x) => x.address === C)?.role).toBe("approval-spender");
	});

	test("ERC-7821 and 7579 batch execute decode, self-call not a target", () => {
		const body = encodeAbiParameters(callList, [
			[
				{ to: A, value: 0n, data: "0x" },
				{
					to: B,
					value: 0n,
					data: encodeFunctionData({
						abi: erc20,
						functionName: "approve",
						args: [C, 1n],
					}),
				},
			],
		]);
		for (const functionName of ["execute", "executeFromExecutor"] as const) {
			const data = encodeFunctionData({
				abi: execAbi,
				functionName,
				args: [batchMode, body],
			});
			const t = targetsFromTransaction({
				from: account,
				to: account,
				data,
				chainId,
			});
			expect(t.map((x) => [x.address, x.role])).toEqual([
				[A, "call"],
				[B, "call"],
				[C, "approval-spender"],
			]);
		}
	});

	test("single and delegatecall execution modes", () => {
		const single = concatHex([A, toHex(0n, { size: 32 }), "0x"]);
		const d1 = encodeFunctionData({
			abi: execAbi,
			functionName: "execute",
			args: [`0x00${"00".repeat(31)}`, single],
		});
		expect(
			targetsFromTransaction({
				from: account,
				to: account,
				data: d1,
				chainId,
			})[0]?.role,
		).toBe("call");
		const dele = encodeFunctionData({
			abi: execAbi,
			functionName: "execute",
			args: [`0xff${"00".repeat(31)}`, concatHex([B, "0x1234"])],
		});
		const t = targetsFromTransaction({
			from: account,
			to: account,
			data: dele,
			chainId,
		});
		expect(t[0]).toMatchObject({ address: B, role: "delegatecall" });
	});

	test("undecodable batch and MultiSend are critical-role targets", () => {
		const bad = encodeFunctionData({
			abi: execAbi,
			functionName: "execute",
			args: [batchMode, "0x1234"],
		});
		const t = targetsFromTransaction({
			from: A,
			to: account,
			data: bad,
			chainId,
		});
		expect(
			t.some((x) => x.role === "delegatecall" && x.via.includes("undecodable")),
		).toBe(true);
		const ms = encodeFunctionData({
			abi: multiSendAbi,
			functionName: "multiSend",
			args: ["0x00"],
		});
		const t2 = targetsFromTransaction({
			to: multiSend[0] as Hex,
			data: ms,
			chainId,
		});
		expect(t2).toEqual([
			{
				address: getAddress(multiSend[0] as string),
				chainId,
				role: "delegatecall",
				via: "undecodable MultiSend",
			},
		]);
	});

	test("nesting beyond max depth is flagged", () => {
		let data: Hex = "0x1234";
		let to = A;
		for (let i = 0; i < 6; i++) {
			data = exec(to, data, 0);
			to = SAFE;
		}
		const t = targetsFromTransaction({ to: SAFE, data, chainId });
		expect(
			t.some((x) => x.role === "delegatecall" && x.via.includes("nesting")),
		).toBe(true);
	});

	test("safe admin self-calls surface the argument address", () => {
		const admin = parseAbi([
			"function enableModule(address module)",
			"function setGuard(address guard)",
			"function setFallbackHandler(address handler)",
			"function addOwnerWithThreshold(address owner, uint256 threshold)",
			"function swapOwner(address prevOwner, address oldOwner, address newOwner)",
		]);
		const cases = [
			encodeFunctionData({
				abi: admin,
				functionName: "enableModule",
				args: [B],
			}),
			encodeFunctionData({ abi: admin, functionName: "setGuard", args: [B] }),
			encodeFunctionData({
				abi: admin,
				functionName: "setFallbackHandler",
				args: [B],
			}),
			encodeFunctionData({
				abi: admin,
				functionName: "addOwnerWithThreshold",
				args: [B, 1n],
			}),
			encodeFunctionData({
				abi: admin,
				functionName: "swapOwner",
				args: [A, C, B],
			}),
		];
		for (const inner of cases) {
			const t = targetsFromTransaction({
				to: SAFE,
				data: exec(SAFE, inner, 0),
				chainId,
			});
			expect(t.find((x) => x.address === B)?.role).toBe("delegatecall");
		}
		expect(
			targetsFromTransaction({ to: SAFE, data: cases[0], chainId }).find(
				(x) => x.address === B,
			)?.via,
		).toBe("Safe module being enabled");
	});
});

describe("control handover", () => {
	test("proxy upgrades and module installs make the new code a delegatecall target", () => {
		const cases = [
			encodeFunctionData({
				abi: handoverAbi,
				functionName: "upgradeTo",
				args: [B],
			}),
			encodeFunctionData({
				abi: handoverAbi,
				functionName: "upgradeToAndCall",
				args: [B, "0x"],
			}),
			encodeFunctionData({
				abi: handoverAbi,
				functionName: "installModule",
				args: [2n, B, "0x"],
			}),
		];
		for (const data of cases) {
			const t = targetsFromTransaction({ to: A, data, chainId, from: A });
			expect(t.find((x) => x.address === B)?.role).toBe("delegatecall");
		}
	});

	test("Safe module execution is walked like execTransaction", () => {
		const data = encodeFunctionData({
			abi: safeModuleExecAbi,
			functionName: "execTransactionFromModule",
			args: [B, 0n, "0x", 1],
		});
		const t = targetsFromTransaction({ to: SAFE, data, chainId });
		expect(t.find((x) => x.address === B)?.role).toBe("delegatecall");
	});

	test("Safe creation checks the singleton, setup delegatecall and fallback handler", () => {
		const initializer = encodeFunctionData({
			abi: safeSetupAbi,
			functionName: "setup",
			args: [[A], 1n, B, "0x1234", C, zeroAddress, 0n, zeroAddress],
		});
		const data = encodeFunctionData({
			abi: safeProxyFactoryAbi,
			functionName: "createProxyWithNonce",
			args: [SAFE, initializer, 0n],
		});
		const t = targetsFromTransaction({ to: A, data, chainId });
		for (const address of [SAFE, B, C])
			expect(t.find((x) => x.address === address)?.role).toBe("delegatecall");
	});

	test("a SafeTx without an operation is treated as delegatecall", () => {
		const t = targetsFromTypedData(
			{
				domain: { chainId, verifyingContract: SAFE },
				types: {
					SafeTx: [
						{ name: "to", type: "address" },
						{ name: "data", type: "bytes" },
					],
				},
				primaryType: "SafeTx",
				message: { to: B, data: "0x" },
			},
			chainId,
		);
		expect(t[0]).toMatchObject({ address: B, role: "delegatecall" });
	});
});
