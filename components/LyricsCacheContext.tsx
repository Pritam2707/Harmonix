// LyricsCacheContext.tsx
import React, { createContext, useContext, useMemo } from 'react';

type LyricsCache = {
    [key: string]: {
        lyrics: string;
        synced: boolean;
        timestamp: number;
    };
};

const LyricsCacheContext = createContext<{
    cache: LyricsCache;
    updateCache: (key: string, value: { lyrics: string; synced: boolean }) => void;
}>({
    cache: {},
    updateCache: () => { },
});

export const LyricsCacheProvider = ({ children }: { children: React.ReactNode }) => {
    const [cache, setCache] = React.useState<LyricsCache>({});

    const updateCache = (key: string, value: { lyrics: string; synced: boolean }) => {
        setCache(prev => ({
            ...prev,
            [key]: {
                ...value,
                timestamp: Date.now(),
            },
        }));
    };

    const value = useMemo(() => ({ cache, updateCache }), [cache]);

    return (
        <LyricsCacheContext.Provider value={value}>
            {children}
        </LyricsCacheContext.Provider>
    );
};

export const useLyricsCache = () => useContext(LyricsCacheContext);