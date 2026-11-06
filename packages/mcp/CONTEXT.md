# mcp

A read-only layer over `checkTargets`. It holds no keys and signs nothing. See `lib/shared/check/CONTEXT.md` for what a verdict proves. This file covers what changes when the reader is an agent rather than a person.

**The action is decided here, not by the model.** `decision.ts` maps the checker's result to `proceed`, `ask_user` or `refuse`. Only a request where every target is `info` proceeds. A check that did not finish refuses even on an ordinary call, where the Snap only warns, because no person is reading the warning. A request with nothing to check never proceeds.

**Trust comes from the operator's configuration.** Pins are read once from `CODEMARK_PINS` with their `PubRegistry` address, and no tool can add one, or a prompt-injected agent could trust the attacker. A registry that changes behind a pin is MISMATCH in the checker, so it refuses. The published binary's `--no-env-file` shebang matters: Bun otherwise loads `.env` from the working directory, so any repository an agent opens could set the pins or the RPC. Running `index.ts` directly does not get this protection.

**Checker text is model input.** Anyone can register a name and publish a release, so `forAgent` drops an unpinned publisher's reason and withholds an unpinned name unless it is short plain ASCII. A pinned publisher's reason is kept because it says why a release was withdrawn, but it is shortened, and the tool descriptions say it is data. A stolen sec key could still put words there; the action itself cannot change.

**What this does not stop.** It helps an honest agent that was handed a bad address. A hijacked agent can skip the tool or ignore the answer. Stopping that takes enforcement in the signer, which this package does not do.
