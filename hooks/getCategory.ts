export const getCategory = (item: any) => {
    if (item.playlistId) return "Playlist";
    if (item.browseId && !item.playlistId) return "Album";
    if (item.videoId) return "Song/Video"; // Songs and videos are grouped together
    return "Unknown";
};