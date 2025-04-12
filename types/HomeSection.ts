import { minimalArtist } from "./Artist";
import { Thumbnail } from "./Thumbnail";

export interface HomeSection {
    title: string;
    contents: {
        type: string;
        title: string;
        thumbnails: [Thumbnail, Thumbnail];
        videoId: string;
        artists?: minimalArtist[];
        album?: {
            name: string;
            id: string;
        }
        browseId?: string;
        playlistId?: string;
        description?: string;
        count?: number
        author?: {
            name: string;
            id: string;
        }[]

    }[]
}