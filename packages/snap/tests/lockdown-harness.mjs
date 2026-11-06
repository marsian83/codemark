// Runs a built Snap bundle the way MetaMask does: under SES lockdown, inside a
// Compartment, with the same override taming as snaps-execution-environments.
// The network is off, so a healthy bundle gets as far as a failed RPC request.
// Prints what the bundle returned as JSON. Run with node, because lockdown
// freezes the whole process and needs a V8 stack API.
import "ses";
import { readFileSync } from "node:fs";

const bundle = readFileSync(process.argv[2], "utf8");
const offline = async () => {
	throw new TypeError("offline");
};
const quiet = { ...console, warn() {}, error() {}, log() {}, info() {} };

lockdown({
	consoleTaming: "unsafe",
	errorTaming: "unsafe",
	overrideTaming: "severe",
	domainTaming: "unsafe",
	stackFiltering: "verbose",
});

const loaded = { exports: {} };
const state = { pins: [] };
new Compartment({
	globals: {
		AbortController,
		atob,
		btoa,
		clearTimeout,
		console: quiet,
		crypto: globalThis.crypto,
		Date,
		ethereum: { request: async () => "0xaa36a7" },
		exports: loaded.exports,
		fetch: offline,
		Headers,
		Math,
		module: loaded,
		Request,
		Response,
		setTimeout,
		snap: {
			request: async ({ method, params }) => {
				if (method !== "snap_manageState") return true;
				return params.operation === "get" ? state : null;
			},
		},
		TextDecoder,
		TextEncoder,
		URL,
		URLSearchParams,
	},
	__options__: true,
}).evaluate(bundle);

const attempt = (run) =>
	run().then(
		(value) => ({ value }),
		(error) => ({ thrown: String(error?.message ?? error) }),
	);

const transaction = await attempt(() =>
	loaded.exports.onTransaction({
		transaction: {
			from: "0x0000000000000000000000000000000000000001",
			to: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
			data: "0x00000000",
			value: "0x0",
		},
		chainId: "eip155:11155111",
		transactionOrigin: "https://codemark.hetairoi.xyz",
	}),
);
const pin = await attempt(() =>
	loaded.exports.onRpcRequest({
		origin: "https://codemark.hetairoi.xyz",
		request: {
			jsonrpc: "2.0",
			id: 1,
			method: "codemark_pin",
			params: { name: "pwnmeswap.eth" },
		},
	}),
);
process.stdout.write(JSON.stringify({ transaction, pin }));
process.exit(0);
