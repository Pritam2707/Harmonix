export type LrcLine = { time: number; text: string };

export function parseLRC(lrc: string): LrcLine[] {
    return lrc
        .split(/\n+/)
        .map((line) => {
            const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);
            if (!match) return null;
            const [, min, sec, ms = "0", text] = match;
            const time = parseInt(min) * 60 + parseInt(sec) + parseInt(ms) / 1000;
            return { time, text: text.trim() };
        })
        .filter((line): line is LrcLine => line !== null && line.text.length > 0)
        .sort((a, b) => a.time - b.time);
}