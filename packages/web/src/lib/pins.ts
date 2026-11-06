import type { Pin } from "@codemark/shared/check";
import { useCallback, useSyncExternalStore } from "react";
import { isAddress } from "viem";
import { config } from "./config";

const storageKey = "codemark.pins";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPins: Pin[] = [];

function read(): Pin[] {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(storageKey);
	} catch {
		raw = null;
	}
	if (raw === cachedRaw) return cachedPins;
	cachedRaw = raw;
	let pins: Pin[] = [];
	if (raw === null) {
		const { name, pubRegistry } = config.defaultPin;
		if (name && isAddress(pubRegistry)) pins = [{ name, pubRegistry }];
	} else {
		try {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				pins = parsed.filter(
					(p): p is Pin =>
						typeof p?.name === "string" && isAddress(p?.pubRegistry),
				);
			}
		} catch {
			pins = [];
		}
	}
	cachedPins = pins;
	return pins;
}

function write(pins: Pin[]) {
	try {
		localStorage.setItem(storageKey, JSON.stringify(pins));
	} catch {
		cachedRaw = JSON.stringify(pins);
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

export function usePins() {
	const pins = useSyncExternalStore(subscribe, read);
	const add = useCallback((pin: Pin) => {
		const rest = read().filter((p) => p.name !== pin.name);
		write([...rest, pin]);
	}, []);
	const remove = useCallback((name: string) => {
		write(read().filter((p) => p.name !== name));
	}, []);
	return { pins, add, remove };
}
