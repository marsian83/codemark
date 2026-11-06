import type { Pin } from "@codemark/shared/check";
import {
	parsePublisherName,
	resolvePubRegistry,
} from "@codemark/shared/ens/publisher";
import { useCallback, useSyncExternalStore } from "react";
import { isAddress } from "viem";
import { config } from "./config";
import { ens } from "./rpc";

const storageKey = "codemark.pins";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPins: Pin[] = [];

function stored(): string | null {
	try {
		return localStorage.getItem(storageKey);
	} catch {
		return cachedRaw ?? null;
	}
}

function parse(raw: string | null): Pin[] {
	if (raw === null) return config.defaultPin ? [config.defaultPin] : [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter(
					(p): p is Pin =>
						typeof p?.name === "string" && isAddress(p?.pubRegistry),
				)
			: [];
	} catch {
		return [];
	}
}

function read(): Pin[] {
	const raw = stored();
	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedPins = parse(raw);
	}
	return cachedPins;
}

function write(pins: Pin[]) {
	const raw = JSON.stringify(pins);
	try {
		localStorage.setItem(storageKey, raw);
	} catch {
		cachedRaw = raw;
		cachedPins = pins;
	}
	for (const l of listeners) l();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	window.addEventListener("storage", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", listener);
	};
}

export async function resolvePin(name: string): Promise<Pin> {
	const parsed = parsePublisherName(name);
	return {
		name: parsed,
		pubRegistry: await resolvePubRegistry(ens, parsed),
	};
}

export function usePins() {
	const pins = useSyncExternalStore(subscribe, read);
	const add = useCallback((pin: Pin) => {
		write([...read().filter((p) => p.name !== pin.name), pin]);
	}, []);
	const remove = useCallback((name: string) => {
		write(read().filter((p) => p.name !== name));
	}, []);
	return { pins, add, remove };
}
