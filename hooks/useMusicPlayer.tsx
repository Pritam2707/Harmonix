import {
    createContext, useContext, useEffect, useRef, useState, ReactNode
} from "react";
import MusicPlayerService, { Track } from "../services/MusicPlayerService";
import { Song } from "../types/Song";


interface MusicPlayerContextType {
    playSong: (songId: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    togglePlay: () => Promise<void>;
    stop: () => Promise<void>;
    playlist: Track[];
    refresh: () => void;
    currentIndex: number
    currentTrack: Song | null;
    loading: boolean;
    playNextSong: () => Promise<void>;
    playPreviousSong: () => Promise<void>;
    skipToIndex: (index: number) => Promise<void>;
}


const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider = ({ children }: { children: ReactNode }) => {


    const [playlist, setPlaylist] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const refresh = () => {
        setPlaylist([...MusicPlayerService.getPlaylist()]);
        setCurrentTrack(MusicPlayerService.getCurrentTrack());
        setCurrentIndex(MusicPlayerService.getCurrentIndex());
        setLoading(MusicPlayerService.getLoading())
    };
    const [loading, setLoading] = useState(false);
    // const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
    // const playlist = useRef<string[]>([]);
    // const currentIndexRef = useRef(0);

    // const [playerState, setPlayerState] = useState({
    //     isPlaying: false,
    //     position: 0,
    //     duration: 0,
    // });

    // useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackProgressUpdated, Event.PlaybackQueueEnded], (event) => {
    //     setPlayerState((prev) => ({
    //         ...prev,
    //         isPlaying: event.type === Event.PlaybackState ? event.state === State.Playing : prev.isPlaying,
    //         position: event.type === Event.PlaybackProgressUpdated ? event.position : prev.position,
    //         duration: event.type === Event.PlaybackProgressUpdated ? event.duration : prev.duration,
    //     }));

    //     if (event.type === Event.PlaybackQueueEnded) {
    //         playNextSong();
    //     }
    // });

    // const fetchWatchPlaylist = async (songId: string) => {
    //     try {
    //         const responseJson = await PythonModule.getWatchPlaylist(songId);
    //         const response = JSON.parse(responseJson);
    //         if (response.tracks?.length) {

    //             playlist.current = response.tracks.map((track: { videoId: string }) => track.videoId);
    //             currentIndexRef.current = 0;
    //         }
    //     } catch (error) {
    //         console.error("Error fetching playlist:", error);
    //     }
    // };




    // const playSongInBackground = async (songId: string) => {
    //     try {
    //         await TrackPlayer.reset();
    //         console.time("Total execution");

    //         // 1. PARALLEL INITIALIZATION
    //         const [songResponse, cachedCheck] = await Promise.all([
    //             PythonModule.getSong(songId),
    //             Promise.all([
    //                 RNFS.exists(`${RNFS.CachesDirectoryPath}/${songId}.mp3`),
    //                 RNFS.exists(`${RNFS.CachesDirectoryPath}/${songId}.json`)
    //             ])
    //         ]);

    //         const [songExists, infoExists] = cachedCheck;
    //         const currentSong = JSON.parse(songResponse);
    //         setCurrentTrack(currentSong);

    //         // 2. STREAMING OR CACHE LOGIC
    //         if (!songExists || !infoExists) {
    //             console.time("Streaming flow");

    //             // Start streaming while setting up player
    //             const streamPromise = PythonModule.streamMusic(songId).then((stream: any) => {
    //                 const streamUrl = JSON.parse(stream).url;
    //                 console.log(stream, streamUrl)
    //                 return TrackPlayer.add({
    //                     id: songId,
    //                     url: streamUrl,
    //                     title: currentSong.videoDetails.title,
    //                     artist: currentSong.videoDetails.author || "Unknown",
    //                     artwork: currentSong.videoDetails.thumbnail.thumbnails.pop()?.url,
    //                 });
    //             });

    //             // Parallel cache writing
    //             const cachePromise = RNFS.writeFile(
    //                 `${RNFS.CachesDirectoryPath}/${songId}.json`,
    //                 songResponse,
    //                 "utf8"
    //             );

    //             await Promise.all([
    //                 streamPromise,
    //                 cachePromise,

    //             ]);

    //             console.timeEnd("Streaming flow");
    //         } else {
    //             console.time("Cache flow");
    //             await TrackPlayer.add({
    //                 id: songId,
    //                 url: `file://${RNFS.CachesDirectoryPath}/${songId}.mp3`,
    //                 title: currentSong.videoDetails.title,
    //                 artist: currentSong.videoDetails.author || "Unknown",
    //                 artwork: currentSong.videoDetails.thumbnail.thumbnails[0]?.url,
    //             });
    //             console.timeEnd("Cache flow");
    //         }

    //         // 3. PLAYBACK INITIATION
    //         console.time("Playback start");
    //         await TrackPlayer.play();

    //         // 4. BACKGROUND TASKS (non-blocking)
    //         BackgroundActions.start(async () => {
    //             // History updates
    //             PythonModule.addHistory(currentSong.videoDetails.videoId);
    //             addHistory({
    //                 videoId: currentSong.videoDetails.videoId,
    //                 title: currentSong.videoDetails.title,
    //                 artist: currentSong.videoDetails.author,
    //                 artwork: currentSong.videoDetails.thumbnail.thumbnails[currentSong.videoDetails.thumbnail.thumbnails.length - 1]?.url,
    //             });

    //             // Cache download for streamed songs
    //             if (!songExists) {
    //                 const track = await TrackPlayer.getActiveTrack();
    //                 if (track?.url.startsWith("http")) {
    //                     RNFS.downloadFile({
    //                         fromUrl: track.url,
    //                         toFile: `${RNFS.CachesDirectoryPath}/${songId}.mp3`
    //                     }).promise.catch(console.warn);
    //                 }
    //             }
    //             // Playlist preloading
    //             if (playlist.current.length === 0 || currentIndexRef.current === playlist.current.length - 1) {
    //                 await fetchWatchPlaylist(songId).catch(console.warn);
    //             }
    //             preloadNextSong();
    //         }, {
    //             taskName: "Music Streaming",
    //             taskTitle: "Playing music...",
    //             taskDesc: "Streaming in background",
    //             taskIcon: { name: "ic_launcher", type: "mipmap" },
    //             linkingURI: "myapp://music-player",
    //             color: "#ff0000",         // optional


    //         });

    //         console.timeEnd("Playback start");
    //         console.timeEnd("Total execution");
    //     } catch (error) {
    //         console.error("Optimized playback error:", error);
    //         setLoading(false);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // const preloadNextSong = async () => {
    //     if (currentIndexRef.current + 1 >= playlist.current.length) return;

    //     const nextSongId = playlist.current[currentIndexRef.current + 1];
    //     console.time(`Preload ${nextSongId}`);

    //     try {
    //         // 1. PARALLEL CACHE CHECK AND METADATA FETCH
    //         const [cacheCheck, songResponse] = await Promise.all([
    //             Promise.all([
    //                 RNFS.exists(`${RNFS.CachesDirectoryPath}/${nextSongId}.mp3`),
    //                 RNFS.exists(`${RNFS.CachesDirectoryPath}/${nextSongId}.json`)
    //             ]),
    //             PythonModule.getSong(nextSongId).catch(() => null) // Don't fail if metadata fails
    //         ]);

    //         const [songExists, infoExists] = cacheCheck;
    //         const nextSong = songResponse ? JSON.parse(songResponse) : null;

    //         // 2. CACHE POPULATION LOGIC
    //         if (songExists && infoExists) {
    //             console.log(`[Preload] Cache hit for ${nextSongId}`);
    //             const songInfo = await RNFS.readFile(`${RNFS.CachesDirectoryPath}/${nextSongId}.json`, 'utf8');
    //             await TrackPlayer.add({
    //                 id: nextSongId,
    //                 url: `file://${RNFS.CachesDirectoryPath}/${nextSongId}.mp3`,
    //                 title: JSON.parse(songInfo).videoDetails?.title || 'Unknown',
    //                 artist: JSON.parse(songInfo).videoDetails?.author || 'Unknown',
    //                 artwork: JSON.parse(songInfo).videoDetails?.thumbnail?.thumbnails[0]?.url,
    //             });
    //         } else {
    //             console.log(`[Preload] Cache miss for ${nextSongId}`);

    //             // Start streaming in background without waiting
    //             const preloadOperation = (async () => {
    //                 try {
    //                     const stream = await PythonModule.streamMusic(nextSongId);
    //                     const streamData = JSON.parse(stream);

    //                     // Add to player queue
    //                     await TrackPlayer.add({
    //                         id: nextSongId,
    //                         url: streamData.url,
    //                         title: nextSong?.videoDetails?.title || 'Unknown',
    //                         artist: nextSong?.videoDetails?.author || 'Unknown',
    //                         artwork: nextSong?.videoDetails?.thumbnail?.thumbnails[0]?.url,
    //                     });

    //                     // Save metadata if available
    //                     if (nextSong) {
    //                         await RNFS.writeFile(
    //                             `${RNFS.CachesDirectoryPath}/${nextSongId}.json`,
    //                             songResponse,
    //                             'utf8'
    //                         );
    //                     }

    //                     // Background caching
    //                     (async () => {
    //                         const track = await TrackPlayer.getActiveTrack();
    //                         if (track?.url?.startsWith('http')) {
    //                             RNFS.downloadFile({
    //                                 fromUrl: track.url,
    //                                 toFile: `${RNFS.CachesDirectoryPath}/${nextSongId}.mp3`,
    //                                 cacheable: true,
    //                             }).promise.catch(console.warn);
    //                         }
    //                     })();
    //                 } catch (e) {
    //                     console.warn(`[Preload] Failed to preload ${nextSongId}:`, e);
    //                 }
    //             })();

    //             // Don't await - let it run in background
    //         }

    //         // 3. PLAYLIST EXTENSION (non-blocking)
    //         if (currentIndexRef.current === playlist.current.length - 2) {
    //             fetchWatchPlaylist(nextSongId).catch(console.warn);
    //         }
    //     } catch (error) {
    //         console.warn('[Preload] Error in preload pipeline:', error);
    //     } finally {
    //         console.timeEnd(`Preload ${nextSongId}`);
    //     }
    // };


    // const playNextSong = async () => {
    //     // Early exit if no next song
    //     if (currentIndexRef.current + 1 >= playlist.current.length) return;

    //     try {
    //         console.time('playNextSong');
    //         currentIndexRef.current += 1;
    //         const nextSongId = playlist.current[currentIndexRef.current];

    //         // 1. PARALLEL OPERATIONS
    //         const [skipPromise, metadataLoad] = await Promise.all([
    //             TrackPlayer.skipToNext(),
    //             (async () => {
    //                 const infoPath = `${RNFS.CachesDirectoryPath}/${nextSongId}.json`;
    //                 if (await RNFS.exists(infoPath)) {
    //                     const songInfo = await RNFS.readFile(infoPath, 'utf8');
    //                     return JSON.parse(songInfo);
    //                 }
    //                 return null;
    //             })()
    //         ]);

    //         // 2. NON-BLOCKING UPDATES
    //         if (metadataLoad) {
    //             setCurrentTrack(metadataLoad);

    //             // Fire-and-forget history updates
    //             Promise.all([
    //                 addHistory({
    //                     videoId: metadataLoad.videoDetails.videoId,
    //                     title: metadataLoad.videoDetails.title,
    //                     artist: metadataLoad.videoDetails.author,
    //                     artwork: metadataLoad.videoDetails.thumbnail.thumbnails[metadataLoad.videoDetails.thumbnail.thumbnails.length - 1]?.url,
    //                 }),
    //                 PythonModule.addHistory(metadataLoad.videoDetails.videoId)
    //             ]).catch(console.warn);
    //         } else {
    //             // Fallback to Python module if no cache
    //             PythonModule.getSong(nextSongId).then((song: any) => {
    //                 const parsed = JSON.parse(song);
    //                 setCurrentTrack(parsed);
    //                 addHistory({
    //                     videoId: parsed.videoDetails.videoId,
    //                     title: parsed.videoDetails.title,
    //                     artist: parsed.videoDetails.author,
    //                     artwork: parsed.videoDetails.thumbnail.thumbnails[0]?.url,
    //                 });
    //             }).catch(console.warn);
    //         }

    //         // 3. BACKGROUND PRELOAD
    //         preloadNextSong(); // Doesn't need await

    //         console.timeEnd('playNextSong');
    //     } catch (error) {
    //         console.error('Optimized playNext error:', error);
    //     }
    // };

    // const playPreviousSong = async () => {
    //     if (currentIndexRef.current > 0) {
    //         currentIndexRef.current -= 1;
    //         await TrackPlayer.skipToPrevious();
    //         const prevSongId = playlist.current[currentIndexRef.current];
    //         let infoPath = `${RNFS.CachesDirectoryPath}/${prevSongId}.json`;

    //         if (await RNFS.exists(infoPath)) {
    //             const songInfoJson = await RNFS.readFile(infoPath, "utf8");
    //             const prevSong: Song = JSON.parse(songInfoJson);
    //             setCurrentTrack(prevSong);  // ✅ Update the currentTrack state
    //         }
    //     }
    // };

    // const pause = async () => await TrackPlayer.pause();
    // const resume = async () => await TrackPlayer.play();
    // const togglePlay = async () => ((await TrackPlayer.getPlaybackState()).state) === State.Playing ? await pause() : await resume();
    // const stop = async () => {
    //     setCurrentTrack(null);
    //     await TrackPlayer.stop();
    //     await BackgroundActions.stop();
    //     setPlayerState({ isPlaying: false, position: 0, duration: 0 });
    // };
    useEffect(() => {
        refresh(); // Initial load
        const listener = () => refresh();
        const unsubscribe = MusicPlayerService.addListener(listener);
        return () => {
            unsubscribe
        };
    }, []);

    return (
        <MusicPlayerContext.Provider
            value={{
                loading,
                currentTrack,
                currentIndex,
                playlist,
                refresh,
                playSong: MusicPlayerService.playTrack,
                pause: MusicPlayerService.togglePlayback,
                resume: MusicPlayerService.togglePlayback,
                togglePlay: MusicPlayerService.togglePlayback,
                stop: MusicPlayerService.stop,
                playNextSong: MusicPlayerService.playNext,
                playPreviousSong: MusicPlayerService.playPrevious,
                skipToIndex: MusicPlayerService.skipToIndex
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
