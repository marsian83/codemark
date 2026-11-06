import { cn } from "../utils/cn";
import { Icon } from "./Icon";

export function Spinner({ className }: { className?: string }) {
	return <Icon name="loader" className={cn("animate-spin", className)} />;
}
