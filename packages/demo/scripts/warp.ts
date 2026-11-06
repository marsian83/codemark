const seconds = Number(process.argv[2] ?? 24 * 3600);
const rpc = process.env.ANVIL_RPC_URL ?? "http://127.0.0.1:8545";

async function call(method: string, params: unknown[]) {
	const res = await fetch(rpc, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	return res.json();
}

console.log(await call("evm_increaseTime", [seconds]));
console.log(await call("evm_mine", []));
