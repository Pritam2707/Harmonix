import TrackPlayer, { State, AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { NativeModules, AppState, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import BackgroundActions from 'react-native-background-actions';
import { Song } from '../types/Song';
import { addHistory } from './HistoryService';

// 1. CONFIGURATION ============================================================
const { PythonModule, } = NativeModules;

// Player configuration for foreground service
const setupPlayer = async () => {
    await TrackPlayer.setupPlayer()
    await TrackPlayer.updateOptions({
        android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
        ],
        compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
        ],
        notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,

        ],
    });
};

// 2. STATE MANAGEMENT =========================================================
type PlayerState = {
    currentTrack: Song | null;
    playlist: Track[];
    currentIndex: number;
    loading: boolean;
};
export interface Track {
    videoId: string
    title: string
    thumbnail:
    {
        url: string
    }[]

}
const initialState: PlayerState = {
    currentTrack: null,
    playlist: [],
    currentIndex: 0,
    loading: false,
};

let playerState = { ...initialState };
const listeners = new Set<() => void>();

const notifyChanges = () => listeners.forEach(listener => listener());

// 3. CACHE MANAGEMENT ========================================================
const getCachePaths = (id: string) => ({
    mp3Path: `${RNFS.CachesDirectoryPath}/${id}.mp3`,
    jsonPath: `${RNFS.CachesDirectoryPath}/${id}.json`,
});

const cacheStream = async (url: string, path: string) => {
    if (!url.startsWith('http')) return;

    try {
        await RNFS.downloadFile({
            fromUrl: url,
            toFile: path,
            background: true,
            discretionary: true,
            cacheable: true,
            progressDivider: 10, // Reduce progress updates
        }).promise;
    } catch (e) {
        console.warn('Cache failed:', e);
    }
};

const fetchWatchPlaylist = async (songId: string) => {
    try {
        const response = await PythonModule.getWatchPlaylist(songId);
        const data = JSON.parse(response);
        if (data.tracks?.length) {
            playerState.playlist = data.tracks;
            playerState.currentIndex = 0;
            notifyChanges();
        }
    } catch (e) {
        console.warn('Watch playlist fetch error:', e);
    }
};
// 4. BACKGROUND TASK =========================================================
const backgroundTask = async (taskData: { song: Song, keepPlaylist?: boolean } | undefined) => {
    if (!taskData) return
    const { song, keepPlaylist } = taskData;

    try {
        // 1. Add to history (batched)
        Promise.all([
            PythonModule.addHistory(song.videoDetails.videoId),
            addHistory({
                videoId: song.videoDetails.videoId,
                title: song.videoDetails.title,
                artist: song.videoDetails.author,
                artwork: song.videoDetails.thumbnail?.thumbnails?.slice(-1)[0]?.url,
            }),
        ]);

        // 2. Cache current track
        const track = await TrackPlayer.getActiveTrack();
        if (track) {
            const { mp3Path } = getCachePaths(track.id);
            await cacheStream(track.url, mp3Path);
        }
        if (!keepPlaylist || playerState.currentIndex > (playerState.playlist.length - 2))
            await fetchWatchPlaylist(song.videoDetails.videoId);
        // 3. Preload next track
        if (playerState.currentIndex + 1 < playerState.playlist.length) {
            const nextId = playerState.playlist[playerState.currentIndex + 1].videoId;
            await preloadTrack(nextId);
        }
    } catch (e) {
        console.warn('Background task error:', e);
    }
};

const startBackgroundService = (song: Song, keepPlaylist?: boolean) => {
    BackgroundActions.start(backgroundTask, {
        taskName: 'MusicStreamer',
        taskTitle: song.videoDetails.title,
        taskDesc: `By ${song.videoDetails.author}`,
        taskIcon: {
            name: 'splash_logo',
            type: 'drawable',
        },
        color: '#f3d3af',
        parameters: { song, keepPlaylist },
        linkingURI: 'myapp://player',

    });
};

// 5. PLAYER CORE =============================================================
const preloadTrack = async (id: string) => {
    try {
        const { mp3Path, jsonPath } = getCachePaths(id);
        const [mp3Exists, jsonExists] = await Promise.all([
            RNFS.exists(mp3Path),
            RNFS.exists(jsonPath),
        ]);

        if (mp3Exists && jsonExists) return;

        const [songData, streamData] = await Promise.all([
            PythonModule.getSong(id),
            PythonModule.streamMusic(id),
        ]);

        const song = JSON.parse(songData);
        const stream = JSON.parse(streamData);

        await TrackPlayer.add({
            id,
            url: stream.url,
            title: song.videoDetails?.title,
            artist: song.videoDetails?.author,
            artwork: song.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
        });

        await RNFS.writeFile(jsonPath, songData, 'utf8');
    } catch (e) {
        console.warn('Preload failed:', e);
    }
};

const playTrack = async (id: string, keepPlaylist?: boolean) => {
    try {
        playerState.loading = true;
        notifyChanges();

        await TrackPlayer.reset();

        const { mp3Path, jsonPath } = getCachePaths(id);
        const [songData, fileChecks] = await Promise.all([
            PythonModule.getSong(id),
            Promise.all([
                RNFS.exists(mp3Path),
                RNFS.exists(jsonPath),
            ]),
        ]);

        const song = JSON.parse(songData);
        playerState.currentTrack = song;
        playerState.loading = false;
        notifyChanges();

        const [hasAudioCache, hasMetadata] = fileChecks;

        if (!hasAudioCache || !hasMetadata) {
            const stream = JSON.parse(await PythonModule.streamMusic(id));
            await TrackPlayer.add({
                id,
                url: stream.url,
                title: song.videoDetails?.title,
                artist: song.videoDetails?.author,
                artwork: song.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
            });
            await RNFS.writeFile(jsonPath, songData, 'utf8');
        } else {
            await TrackPlayer.add({
                id,
                url: `file://${mp3Path}`,
                title: song.videoDetails?.title,
                artist: song.videoDetails?.author,
                artwork: song.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
            });
        }

        await TrackPlayer.play();
        startBackgroundService(song, keepPlaylist);
    } catch (e) {
        console.error('Play error:', e);
        playerState.loading = false;
        notifyChanges();
    }
};

// 6. PLAYER CONTROLS =========================================================
const skipToIndex = async (index: number) => {
    if (index < 0 || index >= playerState.playlist.length) return;

    playerState.currentIndex = index;
    await playTrack(playerState.playlist[index].videoId, true);
    notifyChanges();
};
const playNext = async () => {
    const nextIndex = playerState.currentIndex + 1;

    // Make sure the index is within bounds
    if (nextIndex >= playerState.playlist.length) {
        console.warn("No more songs in the playlist");
        return;
    }

    const nextTrackId = playerState.playlist[nextIndex]?.videoId;
    if (!nextTrackId) {
        console.warn("Next track ID is undefined");
        return;
    }

    // Skip to the next track in the queue
    await TrackPlayer.skipToNext();

    // Update currentIndex first
    playerState.currentIndex = nextIndex;

    // Update currentTrack
    const songData = await PythonModule.getSong(nextTrackId);
    playerState.currentTrack = JSON.parse(songData);

    // Fetch more songs if needed
    if (nextIndex + 2 >= playerState.playlist.length) {
        await fetchWatchPlaylist(nextTrackId);
    }

    // Preload the track after next if it exists
    const preloadTrackId = playerState.playlist[nextIndex + 1]?.videoId;
    if (preloadTrackId) {
        await preloadTrack(preloadTrackId);
    }

    notifyChanges(); // Notify UI / subscribers
};



const playPrevious = async () => {
    if (playerState.currentIndex <= 0) return;

    playerState.currentIndex--;
    await TrackPlayer.skipToPrevious();
    notifyChanges();
};

const togglePlayback = async () => {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
        await TrackPlayer.pause();
    } else {
        await TrackPlayer.play();
    }
};

// 7. LIFECYCLE MANAGEMENT ====================================================
const stopPlayer = async () => {
    playerState.currentTrack = null;
    notifyChanges();
    await TrackPlayer.reset();
    await BackgroundActions.stop();
    playerState = { ...initialState };
    notifyChanges();
};

// Initialize player

// 8. EXPORTS =================================================================
export default {
    setupPlayer,
    playTrack,
    skipToIndex,
    playNext,
    playPrevious,
    togglePlayback,
    stop: stopPlayer,
    addListener: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    getCurrentTrack: () => playerState.currentTrack,
    getPlaylist: () => playerState.playlist,
    getLoading: () => playerState.loading,
    getCurrentIndex: () => playerState.currentIndex,
    isPlaying: async () => (await TrackPlayer.getState()) === State.Playing,
};