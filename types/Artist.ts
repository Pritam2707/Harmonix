import { Thumbnail } from "./Thumbnail";

export interface minimalArtist {
    id: string
    name: string;
    thumbnails: [Thumbnail, Thumbnail];
}
export interface Artisct {
    description: string;
    views: string;
    name: string;
    channelId: string;
    radioId: string;
    subscribers: string;
    thumbnails: [string, string];
    songs: {
        browseId: string;
        results:
        {
            videoId: string;
            title: string;
            thumbnail: string;
            artist: string;
            album: string
        }[]

    }
    albums: {
        results: {
            title: string;
            thumbnails: [string, string];
            year: number;
            browseId: string
        }[]
        browseId: string;
        params: string;
    };
    singles: {
        results:
        {
            title: string;
            thumbnails: [string, string];
            year: number;
            browseId: string;
        }[];

        browseId: string;
        params: string;
    };
    videos: {
        results: [
            {
                title: string
                thumbnails: [string, string];
                views: string[]
                videoId: string,
                playlistId: string;
            }
        ],
        browseId: string;
    },
    related: {
        results:
        {
            browseId: string;
            subscribers: string;
            title: string;
        }[];
    }
}