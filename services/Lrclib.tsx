import { parseLRC } from "../components/LRCParser";

interface Track {
    artist: string;
    title: string;
    album?: string;
    duration: number;
    syncedLyrics: string | null;
    plainLyrics: string | null;
}

const bestMatchingTrack = (tracks: Track[], duration: number): Track | null => {
    return (
        tracks
            .filter(track => track.syncedLyrics !== null)
            .sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))[0] || null
    );
};
function buildQuery(params: Record<string, string | undefined>) {
    return Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
        .join("&");
}
export const getLyrics = async (
    title: string,
    artist: string,
    duration: number,
    album?: string
): Promise<{
    lyrics: string;
    synced: boolean;
} | null> => {
    try {
        const query = buildQuery({
            track_name: title,
            artist_name: artist,
            album_name: album,
        });

        const url = `https://lrclib.net/api/search?${query}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });


        const tracks: Track[] = await response.json();
        const filteredTracks = tracks.filter(track => track.syncedLyrics !== null);
        const bestMatch = bestMatchingTrack(filteredTracks, duration);
        console.log(bestMatch)
        if (bestMatch?.syncedLyrics) {
            console.log(parseLRC(bestMatch.syncedLyrics))
            return {
                lyrics: bestMatch.syncedLyrics,
                synced: true

            };
        } else if (bestMatch?.plainLyrics) {
            return {
                lyrics: bestMatch.plainLyrics,
                synced: false

            };
        }
        else {
            return null
        }
    } catch (error) {
        console.error('getLyrics error:', error);
        throw error;
    }
};
