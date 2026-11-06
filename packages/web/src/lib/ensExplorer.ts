import { config } from "./config";

export const ensExplorer = {
	name: (name: string) => `${config.ensExplorerUrl}/${name}`,
	roles: (name: string) => `${config.ensExplorerUrl}/${name}/roles`,
	registry: (address: string) => `${config.ensExplorerUrl}/registry/${address}`,
	resolver: (address: string) => `${config.ensExplorerUrl}/resolver/${address}`,
};
