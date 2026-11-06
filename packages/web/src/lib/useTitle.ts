import { useEffect } from "react";

export function useTitle(title: string) {
	useEffect(() => {
		document.title = title ? `${title} · Codemark` : "Codemark";
	}, [title]);
}
