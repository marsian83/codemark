import { createContext, useContext } from "react";

const BasePath = createContext("/app");

export const BasePathProvider = BasePath.Provider;
export const useBasePath = () => useContext(BasePath);
