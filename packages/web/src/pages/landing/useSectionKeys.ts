import { useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { allStops } from "./sectionStops";

const arrivedWithin = 2;
const glideMs = 700;
const keysOwnedBy =
	"input, textarea, select, [contenteditable], [role='radio'], [role='tab'], [role='slider'], [role='listbox'], [role='menu']";

function ownsArrowKeys(target: EventTarget | null) {
	return target instanceof Element && target.closest(keysOwnedBy) !== null;
}

export function useSectionKeys() {
	const reduced = useReducedMotion();

	useEffect(() => {
		let destination = 0;
		let pressedAt = 0;

		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
			if (event.defaultPrevented || ownsArrowKeys(event.target)) return;
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}
			event.preventDefault();
			if (event.repeat) return;

			const gliding = performance.now() - pressedAt < glideMs;
			const from = gliding ? destination : window.scrollY;
			const stops = allStops();
			const next =
				event.key === "ArrowDown"
					? stops.find((stop) => stop > from + arrivedWithin)
					: stops.findLast((stop) => stop < from - arrivedWithin);
			if (next === undefined) return;

			destination = next;
			pressedAt = performance.now();
			window.scrollTo({ top: next, behavior: reduced ? "auto" : "smooth" });
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [reduced]);
}
