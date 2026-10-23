import { createContext } from "preact";
import { useContext } from "preact/hooks";

export const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);
