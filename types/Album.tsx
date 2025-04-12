import { minimalArtist } from "./Artist";
export interface minimalAlbum {
    name: string;
    id: string;
}
export interface album {
    title: string;
    type: "Album";
    thumbnails: [string, string],
    description: string;
    artists:
    minimalArtist[];
    year: number,
    trackCount: number,
    duration: string;
    audioPlaylistId: string;
    tracks:
    {
        videoId: string;
        title: string;
        artists: minimalArtist[]
        album: string,
        likeStatus: string,
        thumbnails: [string, string],
        isAvailable: boolean,
        isExplicit: boolean,
        duration: string,
        duration_seconds: number,
        trackNumber: number,
    }[]
    other_versions: [
        {
            title: string,
            year: string,
            browseId: string,
            thumbnails: [string, string],
            isExplicit: boolean
        },
    ],
    duration_seconds: number;
}