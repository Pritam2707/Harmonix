import { Thumbnail } from "./Thumbnail";

export interface Playlist {
    title: string;
    playlistId: string;
    thumbnails: [Thumbnail, Thumbnail];
    description: string;
}