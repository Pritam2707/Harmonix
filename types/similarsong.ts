import { minimalAlbum } from "./Album";
import { minimalArtist } from "./Artist";
import { Playlist } from "./Playlist";
import { Thumbnail } from "./Thumbnail";
interface Song {
    title: string;
    videoId: string;
    artists: minimalArtist[];
    thumbnails: [Thumbnail, Thumbnail];
    album: minimalAlbum;
}
interface SimilarArtist {
    title: string;
    browseId: string;
    subscribers: string;
    thumbnails: [Thumbnail, Thumbnail];
}
interface SongOrAlbum {
    title: string;
    year?: string;
    browseId: string;
    thumbnails: [Thumbnail, Thumbnail];
}
type ContentItem = Song | Playlist | SimilarArtist | SongOrAlbum | string;
export interface relatedToSong {
    title: string;
    contents: ContentItem[] | string;
}
