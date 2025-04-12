interface LyricLine {
    text: string;
    start_time: number;
    end_time: number;
    id: number;
}

export interface LyricsResponse {
    lyrics: LyricLine[] | string;
    source: string;
    hasTimestamps: boolean;
}
