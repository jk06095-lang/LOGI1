
import { createContext, useContext } from 'react';

interface WindowContextType {
  focusWindow: (id: string) => void;
  getZIndex: (id: string) => number;
}

export const WindowContext = createContext<WindowContextType>({
  focusWindow: () => {},
  getZIndex: () => 100, // Default base z-index
});

export const useWindow = () => useContext(WindowContext);
