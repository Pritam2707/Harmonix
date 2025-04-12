import { Thumbnail } from "./Thumbnail";

export interface Song {
    // playabilityStatus: {
    //     status: "Ok" | string;
    //     playableInEmbed: boolean;
    //     contextParams: string
    // },
    // streamingData: {
    //     serverAbrStreamingUrl: string;
    //     adaptiveFormats: [
    //         {
    //             itag: number;
    //             url: string;
    //             bitrate: number;
    //             audioQuality: string;
    //             approxDurationMs: number,
    //             audioSampleRate: number,
    //             audioChannels: number,
    //             loudnessDb: number;
    //         }
    //     ]
    // },
    videoDetails: {
        videoId: string;
        title: string;
        lengthSeconds: number,
        channelId: string;
        thumbnail: {
            thumbnails: [{ url: string }, { url: string }]
        },
        viewCount: number,
        author: string,
    },

}