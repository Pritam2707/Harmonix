import {
    createContext, useContext, useEffect, useRef, useState, ReactNode
} from "react";
import MusicPlayerService, { Track } from "../services/MusicPlayerService";
import { Song } from "../types/Song";
import { AppState, AppStateStatus } from "react-native";
import TrackPlayer, { useTrackPlayerEvents, Event } from "react-native-track-player";


interface MusicPlayerContextType {
    playSong: (songId: string, { keepPlaylist, isLocal, isDownload }: { keepPlaylist?: boolean, isLocal?: boolean, isDownload?: boolean }) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    togglePlay: () => Promise<void>;
    stop: () => Promise<void>;
    refresh: () => void;
    loading: boolean;
    playNextSong: () => Promise<void>;
    playPreviousSong: () => Promise<void>;
    skipToIndex: (index: number) => Promise<void>;
    isMiniPlayerVisible: boolean;
    setIsMiniPlayerVisible: React.Dispatch<React.SetStateAction<boolean>>;
    downloadSong: (videoId: string, name: string) => Promise<{
        success: boolean;
        error?: string;
    }>
    getCachedSongs: () => Promise<Song[]>
    isActive: boolean;
    playPlaylist: (tracks: any, id: string) => Promise<void>,
    getDownloadedSongs: () => Promise<Song[]>
    queue: Track[],
    activeIndex: number | null
}


const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {

    const appState = useRef<AppStateStatus>(AppState.currentState as AppStateStatus);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
        const currentIndex = await TrackPlayer.getActiveTrackIndex();
        if (currentIndex)
            setActiveIndex(currentIndex);
    });
    const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [queue, setQueue] = useState<Track[]>([]);

    const refresh = async () => {
        setLoading(MusicPlayerService.getLoading())
        setIsActive(MusicPlayerService.isActive())
        let newQueue = await TrackPlayer.getQueue() as Track[];
        setQueue(newQueue)
    };
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const listener = () => refresh();
        const unsubscribe = MusicPlayerService.addListener(listener);
        const handleAppStateChange = async (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                refresh();
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            unsubscribe();
            subscription.remove();
        };
    }, []);
    return (
        <MusicPlayerContext.Provider
            value={{
                activeIndex,
                queue,
                isActive,
                isMiniPlayerVisible,
                setIsMiniPlayerVisible,
                loading,
                refresh,
                getCachedSongs: MusicPlayerService.getCachedSongs,
                downloadSong: MusicPlayerService.downloadSong,
                playSong: MusicPlayerService.playTrack,
                pause: MusicPlayerService.togglePlayback,
                resume: MusicPlayerService.togglePlayback,
                togglePlay: MusicPlayerService.togglePlayback,
                stop: MusicPlayerService.stop,
                playNextSong: MusicPlayerService.playNext,
                playPreviousSong: MusicPlayerService.playPrevious,
                skipToIndex: MusicPlayerService.skipToIndex,
                playPlaylist: MusicPlayerService.playPlaylist,
                getDownloadedSongs: MusicPlayerService.getDownloadedSongs
            }}
        >
            {children}
        </MusicPlayerContext.Provider>
    );
};

export const useMusicPlayer = () => {
    const context = useContext(MusicPlayerContext);
    if (!context) {
        throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
    }
    return context;
};
