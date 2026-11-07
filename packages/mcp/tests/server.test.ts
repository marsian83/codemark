import { afterEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Decision } from "../decision";

const sepolia = 11155111;
const router = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const weth = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const pwnmeswap = "pwnmeswap.eth=0x8a8d97f3F4d1235c62aE61cDB3644f574162d204";
const approveSelector = "0x095ea7b3";
const maxAmount = "f".repeat(64);
const live = process.env.CODEMARK_LIVE_TESTS === "0" ? test.skip : test;

let client: Client | undefined;

afterEach(async () => {
	await client?.close();
	client = undefined;
});

async function connect(env: Record<string, string>) {
	client = new Client({ name: "codemark-tests", version: "0.0.0" });
	await client.connect(
		new StdioClientTransport({
			command: "bun",
			args: ["index.ts"],
			cwd: `${import.meta.dir}/..`,
			env: { PATH: process.env.PATH ?? "", ...env },
			stderr: "ignore",
		}),
	);
	return client;
}

async function call(
	c: Client,
	name: string,
	args: Record<string, unknown>,
): Promise<Decision> {
	const response = await c.callTool({ name, arguments: args });
	expect(response.isError).toBeFalsy();
	return response.structuredContent as Decision;
}

function approve(spender: string) {
	return `${approveSelector}${spender.slice(2).toLowerCase().padStart(64, "0")}${maxAmount}`;
}

describe("over MCP, offline", () => {
	test("offers two read-only tools and no way to add a pin", async () => {
		const c = await connect({ SEPOLIA_RPC_URL: "http://127.0.0.1:1" });
		const { tools } = await c.listTools();
		expect(tools.map((t) => t.name).sort()).toEqual([
			"check_signature",
			"check_transaction",
		]);
		for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
	});

	test("refuses when the chain can't be reached", async () => {
		const c = await connect({ SEPOLIA_RPC_URL: "http://127.0.0.1:1" });
		const decision = await call(c, "check_transaction", {
			chainId: sepolia,
			calls: [{ to: router }],
		});
		expect(decision.action).toBe("refuse");
	}, 60_000);

	test("a transfer authorization has nothing to check and asks the user", async () => {
		const c = await connect({ SEPOLIA_RPC_URL: "http://127.0.0.1:1" });
		const decision = await call(c, "check_signature", {
			chainId: sepolia,
			typedData: {
				primaryType: "TransferWithAuthorization",
				message: { from: router, to: weth, value: "1" },
			},
		});
		expect(decision.action).toBe("ask_user");
	});

	test("rejects a malformed address before checking anything", async () => {
		const c = await connect({ SEPOLIA_RPC_URL: "http://127.0.0.1:1" });
		const response = await c.callTool({
			name: "check_transaction",
			arguments: { chainId: sepolia, calls: [{ to: "0x1234" }] },
		});
		expect(response.isError).toBe(true);
	});
});

describe("over MCP, live Sepolia", () => {
	live(
		"an aged release from a pinned publisher proceeds",
		async () => {
			const c = await connect({ CODEMARK_PINS: pwnmeswap });
			const decision = await call(c, "check_transaction", {
				chainId: sepolia,
				calls: [{ to: router }],
			});
			expect(decision.action).toBe("proceed");
			expect(decision.reason).toContain("Released by pwnmeswap.eth");
		},
		60_000,
	);

	live(
		"the same release asks the user when the publisher isn't pinned",
		async () => {
			const c = await connect({});
			const decision = await call(c, "check_transaction", {
				chainId: sepolia,
				calls: [{ to: router }],
			});
			expect(decision.action).toBe("ask_user");
			expect(decision.reason).toContain("haven't pinned");
		},
		60_000,
	);

	live(
		"an approval to an unreleased spender asks the user, whatever token it's on",
		async () => {
			const c = await connect({ CODEMARK_PINS: pwnmeswap });
			const decision = await call(c, "check_transaction", {
				chainId: sepolia,
				calls: [{ to: router, data: approve(weth) }],
			});
			expect(decision.action).toBe("ask_user");
			const spender = decision.targets.find(
				(t) => t.role === "approval-spender",
			);
			expect(spender?.address).toBe(weth);
			expect(spender?.action).toBe("ask_user");
		},
		60_000,
	);

	live(
		"an account upgrade to an unreleased contract is refused",
		async () => {
			const c = await connect({ CODEMARK_PINS: pwnmeswap });
			const decision = await call(c, "check_transaction", {
				chainId: sepolia,
				calls: [{ to: router }],
				authorizationList: [{ address: weth, chainId: sepolia }],
			});
			expect(decision.action).toBe("refuse");
			expect(decision.reason).toContain("Don't hand your account");
		},
		60_000,
	);

	live(
		"a pin whose registry has changed is refused",
		async () => {
			const c = await connect({
				CODEMARK_PINS:
					"pwnmeswap.eth=0x0000000000000000000000000000000000000001",
			});
			const decision = await call(c, "check_transaction", {
				chainId: sepolia,
				calls: [{ to: router }],
			});
			expect(decision.action).toBe("refuse");
		},
		60_000,
	);
});
