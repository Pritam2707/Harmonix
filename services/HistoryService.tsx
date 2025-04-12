import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "music_history";
const MAX_HISTORY_LENGTH = 100; // Optional: cap history to limit size

export interface SongHistory {
    videoId: string;
    title: string;
    artist: string;
    artwork: string;
    played?: string;
}

// Add a song to history (removes duplicates, caps length)
export const addHistory = async (song: SongHistory) => {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const history: SongHistory[] = raw ? JSON.parse(raw) : [];

        // Remove duplicates
        const filtered = history.filter(item => item.videoId !== song.videoId);

        // Prepend new entry
        const updated = [{ ...song, played: new Date().toISOString() }, ...filtered];

        // Optionally limit size
        const capped = updated.slice(0, MAX_HISTORY_LENGTH);

        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(capped));
    } catch (error) {
        console.error("Error saving history:", error);
    }
};

// Fetch full song history
export const getHistory = async (): Promise<SongHistory[]> => {
    try {
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error("Error loading history:", error);
        return [];
    }
};

// Clear entire history
export const clearHistory = async () => {
    try {
        await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Error clearing history:", error);
    }
};
