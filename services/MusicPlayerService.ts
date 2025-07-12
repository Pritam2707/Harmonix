import TrackPlayer, { State, AppKilledPlaybackBehavior, Capability } from 'react-native-track-player';
import { NativeModules, } from 'react-native';
import RNFS from 'react-native-fs';
import { Song } from '../types/Song';
import { addHistory } from './HistoryService';
import { getLyrics } from './Lrclib';

// 1. CONFIGURATION ============================================================
const { PythonModule, } = NativeModules;

// Player configuration for foreground service
let isPlayerSetup = false;

const setupPlayer = async () => {
    if (isPlayerSetup) return;

    try {
        await TrackPlayer.setupPlayer();
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
        isPlayerSetup = true;
        console.log("Player init")

    } catch (error) {
        console.error('Player setup failed:', error);
        isPlayerSetup = false;
        throw error;
    }
};

// 2. STATE MANAGEMENT =========================================================
type PlayerState = {
    loading: boolean;
    playlistId: string | null;
    isActive: boolean;
};
export interface Track {
    id: string
    title: string
    artwork: string,
    artist: string,
    url: string
    duration: number;
}
const initialState: PlayerState = {
    isActive: false,
    loading: false,
    playlistId: null,

};

let playerState = { ...initialState };
const listeners = new Set<() => void>();

const notifyChanges = () => listeners.forEach(listener => listener());

// 3. CACHE MANAGEMENT ========================================================
// Cache directory existence checks
const directoryCache = new Map<string, boolean>();

const ensureDirectoryExists = async (path: string) => {
    if (directoryCache.get(path)) return;

    const exists = await RNFS.exists(path);
    if (!exists) {
        await RNFS.mkdir(path);
    }
    directoryCache.set(path, true);
};

const getCachePaths = async (id: string, name?: string) => {
    const harmonixFolder = `${RNFS.CachesDirectoryPath}`;
    const harmonixCacheFolder = `${harmonixFolder}`;

    await Promise.all([
        ensureDirectoryExists(harmonixFolder),
        ensureDirectoryExists(harmonixCacheFolder),
        ensureDirectoryExists(`${RNFS.DocumentDirectoryPath}/downloads`)
    ]);

    return ({
        // downloadPath: `${harmonixFolder}/${name}.mp3`,
        mp3Path: `${harmonixCacheFolder}/${id}.mp3`,
        jsonPath: `${harmonixCacheFolder}/${id}.json`,
        thumbPath: `${harmonixCacheFolder}/${id}.jpg`,
        tempMp3Path: `${harmonixFolder}/${id}_temp.mp3`,
        downloads: `${RNFS.DocumentDirectoryPath}/downloads`
    });
};




const downloadSong = async (videoId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { mp3Path, jsonPath, thumbPath, downloads } = await getCachePaths(videoId);

        const dlMp3 = `${downloads}/${videoId}.mp3`;
        const dlJson = `${downloads}/${videoId}.json`;
        const dlThumb = `${downloads}/${videoId}.jpg`;


        // If already downloaded, return early
        const [hasDlMp3, hasDlJson, hasDlThumb] = await Promise.all([
            RNFS.exists(dlMp3),
            RNFS.exists(dlJson),
            RNFS.exists(dlThumb),
        ]);

        if (hasDlMp3 && hasDlJson && hasDlThumb) {
            return { success: true };
        }

        // Check cache status
        const [hasAudioCache, hasMetadata, hasThumbCache] = await Promise.all([
            RNFS.exists(mp3Path),
            RNFS.exists(jsonPath),
            RNFS.exists(thumbPath),
        ]);

        // If not cached, get song and download
        if (!hasMetadata) {
            const songData = await PythonModule.getSong(videoId);
            await RNFS.writeFile(jsonPath, songData, 'utf8');
        }

        const songData = await RNFS.readFile(jsonPath, 'utf8');
        const song = JSON.parse(songData);
        const thumbUrl = song.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url;

        if (!hasThumbCache && thumbUrl) {
            await cacheThumb(thumbUrl, thumbPath);
        }

        if (!hasAudioCache) {
            const stream = JSON.parse(await PythonModule.streamMusic(videoId));
            await cacheStream(stream.url, mp3Path);
        }

        // Copy all files to Downloads
        await Promise.all([
            RNFS.copyFile(mp3Path, dlMp3),
            RNFS.copyFile(jsonPath, dlJson),
            RNFS.copyFile(thumbPath, dlThumb),
        ]);

        return { success: true };
    } catch (e) {
        console.error(`Failed to download ${videoId}:`, e);
        return { success: false, error: e?.toString() };
    }
};


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
const cacheThumb = async (url: string, path: string) => {
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
        console.log("fetching", songId);
        const response = await PythonModule.getWatchPlaylist(songId);
        const data = JSON.parse(response);
        console.log(data)
        playerState.playlistId = data.playlistId


        for (let i = 1; i < data.tracks.length; i++) {
            if (!playerState.playlistId || playerState.playlistId !== data.playlistId) return;
            const track = data.tracks[i];
            console.log("adding", i);
            const url = await PythonModule.streamMusic(track.videoId)

            const item = {
                id: track.videoId,
                url: JSON.parse(url).url,
                title: track.title,
                artist: track.artists.map((a: { name: string }) => a.name).join(', '),
                artwork: track.thumbnail?.slice(-1)[0]?.url,
            };
            TrackPlayer.add(item);
            notifyChanges();
            console.log("added", i);

        }

    } catch (e) {
        console.warn('Watch playlist fetch error:', e);
    }
};

const getDownloadedSongs = async (): Promise<Song[]> => {
    try {
        // 1. Read all files in the downloads directory
        const files = await RNFS.readDir(RNFS.DocumentDirectoryPath + "/downloads");

        // 2. Filter valid JSON metadata files
        const jsonFiles = files.filter(file =>
            file.name.endsWith('.json') && file.size > 0
        );

        const concurrencyLimit = 5;
        const batches = [];

        for (let i = 0; i < jsonFiles.length; i += concurrencyLimit) {
            batches.push(jsonFiles.slice(i, i + concurrencyLimit));
        }

        const songs: Song[] = [];

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(async (file) => {
                    try {
                        const data = await RNFS.readFile(file.path, 'utf8');

                        if (!data.includes('videoDetails') || !data.includes('videoId')) {
                            return null;
                        }

                        const song = JSON.parse(data);
                        if (song?.videoDetails?.videoId) {
                            const mp3Path = file.path.replace('.json', '.mp3');
                            const hasAudio = await RNFS.exists(mp3Path);
                            return hasAudio ? song : null;
                        }

                        return null;
                    } catch (err) {
                        console.warn(`Error reading ${file.name}:`, err);
                        return null;
                    }
                })
            );

            songs.push(...batchResults.filter(Boolean) as Song[]);
        }

        return songs;
    } catch (e) {
        console.error('Failed to fetch downloaded songs:', e);
        return [];
    }
};

const getCachedSongs = async (): Promise<Song[]> => {
    try {
        const cacheDir = RNFS.CachesDirectoryPath;

        // 1. First, quickly get all files in the directory
        const files = await RNFS.readDir(cacheDir);

        // 2. Filter for JSON files in memory (faster than checking each file)
        const jsonFiles = files.filter(file =>
            file.name.endsWith('.json') &&
            file.size > 0 // Skip empty files
        );

        // 3. Process files in parallel with limited concurrency
        const concurrencyLimit = 5; // Adjust based on device performance
        const batches = [];

        for (let i = 0; i < jsonFiles.length; i += concurrencyLimit) {
            const batch = jsonFiles.slice(i, i + concurrencyLimit);
            batches.push(batch);
        }

        const songs: Song[] = [];

        for (const batch of batches) {
            const batchResults = await Promise.all(
                batch.map(async (file) => {
                    try {
                        // 4. Read file without checking existence again (we already have file info)
                        const data = await RNFS.readFile(file.path, 'utf8');

                        // 5. Quick validation before parsing
                        if (!data.includes('videoDetails') || !data.includes('videoId')) {
                            return null;
                        }

                        const song = JSON.parse(data);

                        // 6. Validate essential structure
                        if (song?.videoDetails?.videoId) {
                            // 7. Check if corresponding audio file exists
                            const mp3Path = file.path.replace('.json', '.mp3');
                            const hasAudio = await RNFS.exists(mp3Path);

                            return hasAudio ? song : null;
                        }
                        return null;
                    } catch (err) {
                        console.warn(`Error processing ${file.name}:`, err);
                        return null;
                    }
                })
            );

            // 8. Filter out nulls and add to results
            songs.push(...batchResults.filter(Boolean) as Song[]);
        }

        return songs;
    } catch (e) {
        console.error('Failed to fetch cached songs:', e);
        return [];
    }
};


// 4. BACKGROUND TASK =========================================================

const saveHistory = async (song: Song) => {
    await Promise.all([
        console.log(await PythonModule.addHistory(song.videoDetails.videoId)),
        addHistory({
            videoId: song.videoDetails.videoId,
            title: song.videoDetails.title,
            artist: song.videoDetails.author,
            artwork: song.videoDetails.thumbnail?.thumbnails?.slice(-1)[0]?.url,
        }),
    ])
}

const backgroundTask = async (taskData: { song: Song, keepPlaylist?: boolean, isLocal?: boolean } | undefined) => {
    if (!taskData) return;
    const { song, keepPlaylist, isLocal } = taskData;
    if (isLocal) return;
    try {

        if (!song) return;
        await Promise.all([
            // Playlist management
            saveHistory(song),
            (async () => {
                const index = await TrackPlayer.getActiveTrackIndex();
                const queue = await TrackPlayer.getQueue();
                console.log(queue, index, keepPlaylist)
                if (index === undefined) return
                if (!keepPlaylist || index > (queue.length - 2)) {
                    await fetchWatchPlaylist(song.videoDetails.videoId);
                }
            })()
        ]);
    } catch (e) {
        console.warn('Background task error:', e);
    }
};



const playTrack = async (
    id: string,
    { keepPlaylist, isLocal, isDownload }: { keepPlaylist?: boolean; isLocal?: boolean; isDownload?: boolean }
) => {
    try {
        playerState.playlistId = null;
        playerState.loading = true;
        playerState.isActive = true;
        notifyChanges();
        await TrackPlayer.reset();

        const { mp3Path, jsonPath, thumbPath, downloads } = await getCachePaths(id);

        let trackMp3Path = mp3Path;
        let trackJsonPath = jsonPath;
        let trackThumbPath = thumbPath;

        // If playing from Downloads
        if (isDownload) {
            const downloadDir = downloads;
            trackMp3Path = `${downloadDir}/${id}.mp3`;
            trackJsonPath = `${downloadDir}/${id}.json`;
            trackThumbPath = `${downloadDir}/${id}.jpg`;
        }

        const [hasAudio, hasMetadata, hasThumb] = await Promise.all([
            RNFS.exists(trackMp3Path),
            RNFS.exists(trackJsonPath),
            RNFS.exists(trackThumbPath),
        ]);

        if ((isDownload || isLocal) && !hasAudio) {
            throw new Error(`Audio file not available offline at ${trackMp3Path}`);
        }

        const songData = hasMetadata
            ? await RNFS.readFile(trackJsonPath, 'utf8')
            : await PythonModule.getSong(id); // fallback only for non-offline

        const song = JSON.parse(songData) as Song;

        const getArtwork = () => {
            if (hasThumb) return `file://${trackThumbPath}`;
            return song.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url;
        };

        let trackUrl: string;

        if (isDownload || isLocal) {
            trackUrl = `file://${trackMp3Path}`;
        } else if (!hasAudio) {
            const stream = JSON.parse(await PythonModule.streamMusic(id));
            trackUrl = stream.url;
            RNFS.writeFile(jsonPath, songData, 'utf8').catch(console.warn); // background cache
        } else {
            trackUrl = `file://${trackMp3Path}`;
        }
        // console.log(await getLyrics(song.videoDetails.title, song.videoDetails.author, song.videoDetails.lengthSeconds));

        await TrackPlayer.setQueue([{
            id,
            url: trackUrl,
            title: song.videoDetails?.title,
            artist: song.videoDetails?.author,
            artwork: getArtwork(),

        } as Track]);
        playerState.loading = false;
        notifyChanges();
        await TrackPlayer.play();
        notifyChanges();

        backgroundTask({ song, keepPlaylist, isLocal });
    } catch (e) {
        console.error('Play error:', e);
        playerState.loading = false;
        notifyChanges();
        throw e;
    }
};

// 6. PLAYER CONTROLS =========================================================
const skipToIndex = async (index: number) => {
    const queue = await TrackPlayer.getQueue()
    if (index < 0 || index >= queue.length) return;
    await TrackPlayer.skip(index);
};
const playNext = async () => {

    // Skip to the next track in the queue
    TrackPlayer.skipToNext();
    // Fetch more songs if needed
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    if (!currentIndex) return;
    const nextIndex = currentIndex + 1;
    const queue = await TrackPlayer.getQueue();
    if (nextIndex >= queue.length) {
        console.warn("No more songs in the queue");
        return;
    }

    const nextTrackId = queue[nextIndex]?.id;
    if (!nextTrackId) {
        console.warn("Next track ID is undefined");
        return;
    }
    if (nextIndex + 2 >= queue.length) {
        await fetchWatchPlaylist(nextTrackId);
    }
    notifyChanges(); // Notify UI / subscribers
};


const playPlaylist = async (tracks: any, id: string) => {
    playTrack(tracks[0].videoId, { keepPlaylist: true });
    for (let i = 1; i < tracks.length; i++) {
        if (playerState.playlistId !== id) return;
        const track = tracks[i];
        PythonModule.streamMusic(track.videoId).then((url: string) => {
            const item = {
                id: track.videoId,
                url,
                title: track.title,
                artist: track.videoDetails.author,
                artwork: track.thumbnail || track.thumbnails?.slice(-1)[0]?.url,
            };
            TrackPlayer.add(item);
        });
    }
}



const playPrevious = async () => {
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    const queue = await TrackPlayer.getQueue();
    if (!queue || !currentIndex || currentIndex <= 0) return;
    try {
        TrackPlayer.skipToPrevious();

    } catch (err) {
        console.error("Error in playPrevious:", err);
    }
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
    try {

        await Promise.allSettled([
            TrackPlayer.reset(),
        ]);

        playerState = { ...initialState };
        notifyChanges();
    } catch (e) {
        console.error('Error stopping player:', e);
    }
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
    downloadSong,
    getLoading: () => playerState.loading,
    getCachedSongs,
    getDownloadedSongs,
    isActive: () => playerState.isActive,
    isPlaying: async () => (await TrackPlayer.getState()) === State.Playing,
    playPlaylist,
};