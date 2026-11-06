import { type Address, parseAbi, parseAbiParameters } from "viem";

export const permit2Address: Address =
	"0x000000000022d473030f116ddee9f6b43ac78ba3";

export const erc20ApprovalAbi = parseAbi([
	"function approve(address spender, uint256 amount)",
	"function increaseAllowance(address spender, uint256 addedValue)",
	"function setApprovalForAll(address operator, bool approved)",
]);

export const permit2Abi = parseAbi([
	"function approve(address token, address spender, uint160 amount, uint48 expiration)",
	"function permit(address owner, ((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes signature)",
	"function permit(address owner, ((address token, uint160 amount, uint48 expiration, uint48 nonce)[] details, address spender, uint256 sigDeadline) permitBatch, bytes signature)",
]);

export const safeAbi = parseAbi([
	"function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures)",
]);

export const multiSendAbi = parseAbi([
	"function multiSend(bytes transactions)",
]);

export const safeAdminAbi = parseAbi([
	"function enableModule(address module)",
	"function setGuard(address guard)",
	"function setModuleGuard(address moduleGuard)",
	"function setFallbackHandler(address handler)",
	"function addOwnerWithThreshold(address owner, uint256 threshold)",
	"function swapOwner(address prevOwner, address oldOwner, address newOwner)",
]);

export const safeAdminVia: Record<string, string> = {
	enableModule: "Safe module being enabled",
	setGuard: "Safe guard being set",
	setModuleGuard: "Safe module guard being set",
	setFallbackHandler: "Safe fallback handler being set",
	addOwnerWithThreshold: "Safe owner being added",
	swapOwner: "Safe owner being swapped in",
};

export const executeAbi = parseAbi([
	"function execute(bytes32 mode, bytes executionCalldata)",
	"function executeFromExecutor(bytes32 mode, bytes executionCalldata)",
	"function execute((address target, uint256 value, bytes callData) execution)",
]);

export const executionListParams = parseAbiParameters(
	"(address to, uint256 value, bytes data)[] calls",
);
