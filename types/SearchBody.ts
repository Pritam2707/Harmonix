import { minimalArtist } from "./Artist";
import { Thumbnail } from "./Thumbnail";

interface BaseSearch {
    category: "Top result" | "Songs" | "Albums" | "Community Playlists" | "Videos" | "Artists" | "Profiles";
    resultType: "video" | "song" | "album" | "playlist" | "artist";
}
export interface SongSearch extends BaseSearch {
    views: string;
    artists: minimalArtist[];
    category: "Songs";
    resultType: "song";
    duration: string,
    duration_seconds: number
    title: string;
    thumbnails: [Thumbnail, Thumbnail];
}
// interface VideoSearch extends BaseSearch {
//     title: string;
//     views: string;
//     artists: minimalArtist[];
//     category: "Videos";
//     resultType: "video";
//     thumbnails: [Thumbnail, Thumbnail];
// }
// interface CommunityPlaylistSearch extends BaseSearch {
//     playlistId: string;
//     resultType: "playlist";
//     title: string;
//     thumbnails: [Thumbnail, Thumbnail];
// }
// interface AlbumSearch extends BaseSearch {
//     category: "Albums";
//     resultType: "album";
//     browseId: string;
//     playlistId: string;
//     title: string;
//     thumbnails: [Thumbnail, Thumbnail];
// }
// interface ArtistSearch extends BaseSearch {
//     browseId: string;
//     category: "Artists";
//     artist: string,
//     thumbnails: [Thumbnail, Thumbnail];
//     // "radioId": "RDEMkjHYJjL1a3xspEyVkhHAsg"
// }
export interface SearchResult {
    category: "Top result" | "Songs" | "Albums" | "Community Playlists" | "Videos" | "Artists" | "Profiles";
    resultType: "video" | "song" | "album" | "playlist" | "artist";

    // Common Properties
    title: string;
    thumbnails: Thumbnail[];

    // Optional Properties (only exist for some result types)
    views?: string;
    artists?: minimalArtist[];
    duration?: string;
    duration_seconds?: number;
    playlistId?: string;
    browseId?: string;
    artist?: string;
    videoId?: string;
}