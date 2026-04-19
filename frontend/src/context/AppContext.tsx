import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface AppState {
  searchQuery: string;
  selectedGenre: string;
  sortBy: string;
  order: 'ASC' | 'DESC';
  currentPage: number;
}

interface AppContextValue extends AppState {
  setSearchQuery: (q: string) => void;
  setSelectedGenre: (g: string) => void;
  setSortBy: (s: string) => void;
  setOrder: (o: 'ASC' | 'DESC') => void;
  setCurrentPage: (p: number) => void;
  resetFilters: () => void;
}

const defaultState: AppState = {
  searchQuery: '',
  selectedGenre: '',
  sortBy: 'createdAt',
  order: 'DESC',
  currentPage: 1,
};

const AppContext = createContext<AppContextValue | null>(null);

/**
 * AppProvider wraps the whole app and holds shared filter/search state.
 * Any component can read/write these values via useAppContext().
 */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(defaultState);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setState((s) => ({ ...s, searchQuery, currentPage: 1 }));
  }, []);

  const setSelectedGenre = useCallback((selectedGenre: string) => {
    setState((s) => ({ ...s, selectedGenre, currentPage: 1 }));
  }, []);

  const setSortBy = useCallback((sortBy: string) => {
    setState((s) => ({ ...s, sortBy }));
  }, []);

  const setOrder = useCallback((order: 'ASC' | 'DESC') => {
    setState((s) => ({ ...s, order }));
  }, []);

  const setCurrentPage = useCallback((currentPage: number) => {
    setState((s) => ({ ...s, currentPage }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        setSearchQuery,
        setSelectedGenre,
        setSortBy,
        setOrder,
        setCurrentPage,
        resetFilters,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
