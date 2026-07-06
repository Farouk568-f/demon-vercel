import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Movie, Episode } from '../types';

export interface PipAnchorRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface PipData {
    item: Movie;
    type: 'movie' | 'tv';
    season?: number;
    episode?: Episode;
    currentTime: number;
    isPlaying: boolean;
    streamUrl: string;
}

interface PlayerContextType {
    pipData: PipData | null;
    setPipData: (data: PipData | null) => void;
    pipAnchor: PipAnchorRect | null;
    setPipAnchor: (anchor: PipAnchorRect | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pipData, setPipData] = useState<PipData | null>(null);
    const [pipAnchor, setPipAnchor] = useState<PipAnchorRect | null>(null);

    return (
        <PlayerContext.Provider value={{ pipData, setPipData, pipAnchor, setPipAnchor }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = (): PlayerContextType => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};
