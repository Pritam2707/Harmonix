import os
import json
import time
import zlib
import threading
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FutureTimeoutError

# ─────────────────────────────────────────────
# 🔧 Configuration
# ─────────────────────────────────────────────

# Android-specific file paths
STORAGE_PATH = "/data/user/0/com.harmonix/files"
BROWSER_JSON = os.path.join(STORAGE_PATH, "browser.json")
COOKIE_FILE = os.path.join(STORAGE_PATH, "cookies.txt")
NETSCAPE_COOKIE_FILE = os.path.join(STORAGE_PATH, "cookies_netscape.txt")

# Thread pool for concurrent operations
_EXECUTOR = ThreadPoolExecutor(max_workers=2)

# Lazy-loaded modules
_yt_dlp = None
_YTMusic = None
_ytmusic_instance = None

# ─────────────────────────────────────────────
# 🚀 Optimized yt-dlp Configuration
# ─────────────────────────────────────────────

YDL_OPTIONS = {
    "noplaylist": True,
    "skip_download": True,
    "quiet": True,
    "no_warnings": True,
    "nocheckcertificate": True,
    "cachedir": False,
    "retries": 0,
    "force-ipv4": True,
    "simulate": True,
    "youtube_include_dash_manifest": False,
    "youtube_include_hls_manifest": False,
    "format": "bestaudio[ext=m4a][abr<=128]/bestaudio[ext=mp3][abr<=128]",
    "extractor_args": {
        "youtube": {
            "skip": ["hls", "dash", "translated_subs", "thumbnails"],
            "player_client": ["android"],
            "player_skip": ["configs", "webpage"],
        }
    },
    "http_headers": {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
    },
    "socket_timeout": 2,
    "extract_flat": "in_playlist",
    "load_info_interval": 0,
    "ignore_no_formats_error": True,
    "lazy_extractors": True,
    "dns": "8.8.8.8",
    "dns_cache": True,
    "geo_bypass": True,
    "compat_opts": {
        "no-youtube-chapter": True,
        "no-playlist-metadata": True,
         "no-youtube-unavailable-videos": True,
        "no-youtube-channel-redirect": True,
        "no-youtube-prefer-utc-upload-date": True
    },
    "noresizebuffer": True,
    "http_chunk_size": 16384,
    "nooverwrites": True,
    "noprogress": True,
    "http_chunk_size": 8192,
    "cookie":NETSCAPE_COOKIE_FILE
}

# ─────────────────────────────────────────────
# 🔄 Core Functions
# ─────────────────────────────────────────────

def get_ytdl():
    global _yt_dlp
    if _yt_dlp is None:
        import yt_dlp as yt
        _yt_dlp = yt
    return _yt_dlp.YoutubeDL(YDL_OPTIONS)

def get_ytmusic():
    global _YTMusic, _ytmusic_instance
    if _ytmusic_instance is None:
        if _YTMusic is None:
            from ytmusicapi import YTMusic as YTM
            _YTMusic = YTM
        
        if os.path.exists(BROWSER_JSON):
            _ytmusic_instance = _YTMusic(BROWSER_JSON)
        else:
            _ytmusic_instance = _YTMusic()
    return _ytmusic_instance

def convert_cookies_to_netscape(input_file=COOKIE_FILE, output_file=NETSCAPE_COOKIE_FILE):
    if not os.path.exists(input_file):
        return False

    with open(input_file, "r") as f:
        lines = f.read().splitlines()

    netscape_cookies = ["# Netscape HTTP Cookie File\n"]
    for line in lines:
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        netscape_cookies.append(f".music.youtube.com\tTRUE\t/\tTRUE\t2147483647\t{key}\t{value}\n")

    with open(output_file, "w") as f:
        f.write("".join(netscape_cookies))
    return True

def load_browser_data():
    if not os.path.exists(BROWSER_JSON):
        return None
        
    with open(BROWSER_JSON, 'rb') as f:
        data = json.load(f)
    
    if "Cookie" not in data:
        return None
        
    with open(COOKIE_FILE, 'w') as f:
        f.write(data["Cookie"].replace("; ", "\n"))
    
    return convert_cookies_to_netscape()

def warmup():
    """Initialize components in background"""
    def _warmup():
        try:
            # Warm up yt-dlp
            ydl = get_ytdl()
            ydl.extract_info("https://www.youtube.com/watch?v=MvsAesQ-4zA", download=False)
            
            # Warm up YTMusic
            get_ytmusic().get_home(limit=1)
        except Exception:
            pass

    threading.Thread(target=_warmup, daemon=True).start()
    return "Warmup initiated"

# ─────────────────────────────────────────────
# ⚡ API Response Helpers
# ─────────────────────────────────────────────

def safe_api_call(func, *args, **kwargs):
    """Wrapper for safe API calls with timeout"""
    try:
        # Set a timeout for the future (5 seconds)
        future = _EXECUTOR.submit(func, *args, **kwargs)
        result = future.result(timeout=5)  # Set timeout here
        return result
    except FutureTimeoutError:
        return {"error": "TimeoutError", "type": "TimeoutError"}
    except Exception as e:
        return {"error": str(e), "type": e.__class__.__name__}

def json_response(data, compress=False):
    """Optimized JSON response with optional compression"""
    json_str = json.dumps(data, separators=(',', ':'))
    return zlib.compress(json_str.encode()) if compress else json_str

# ─────────────────────────────────────────────
# 🎵 Music Streaming
# ─────────────────────────────────────────────

def stream_music(video_id):
    try:
        ydl = get_ytdl()
        info = ydl.extract_info(
            f"https://www.youtube.com/watch?v={video_id}",
            download=False,
            process=False
        )
        streaming_url = info.get('url') or info.get('formats')[0]['url']
        return json_response({"url": streaming_url})
    except Exception as e:
        return json_response({"error": str(e)})

# ─────────────────────────────────────────────
# 📋 Library Management
# ─────────────────────────────────────────────

@lru_cache(maxsize=32)
def get_song(song_id):
    return json_response(safe_api_call(get_ytmusic().get_song, song_id))

@lru_cache(maxsize=16)
def get_album(album_id):
    return json_response(safe_api_call(get_ytmusic().get_album, album_id))

def get_playlist(playlist_id):
    return json_response(safe_api_call(get_ytmusic().get_playlist, playlist_id))

def get_watch_playlist(video_id=None):
    return json_response(
        safe_api_call(
            get_ytmusic().get_watch_playlist,
            videoId=video_id,
            limit=10
        )
    )

def get_song_details(video_id):
    try:
        watch_playlist = safe_api_call(get_ytmusic().get_watch_playlist, video_id)
        if not watch_playlist or "tracks" not in watch_playlist:
            return json_response({"error": "Invalid or non-music video ID"})

        song = safe_api_call(get_ytmusic().get_song, video_id)
        related_id = watch_playlist.get("related")
        lyrics_id = watch_playlist.get("lyrics")

        response_data = {
            "track": watch_playlist.get("tracks")[0],
            "title": song.get("videoDetails", {}).get("title"),
            "videoId": video_id,
            "artists": song.get("videoDetails", {}).get("author"),
            "thumbnails": song.get("videoDetails", {}).get("thumbnail"),
            "album": song.get("album"),
            "duration": song.get("videoDetails", {}).get("lengthSeconds"),
            "lyrics": safe_api_call(get_ytmusic().get_lyrics, lyrics_id) if lyrics_id else None,
            "related": safe_api_call(get_ytmusic().get_song_related, related_id) if related_id else None
        }

        return json_response(response_data)
    except Exception as e:
        return json_response({"error": str(e)})

# ─────────────────────────────────────────────
# 🔍 Search Functions
# ─────────────────────────────────────────────

def search_music(query):
    def _search():
        return get_ytmusic().search(query, limit=40, ignore_spelling=True)
    
    future = _EXECUTOR.submit(_search)
    return json_response(future.result())

def get_search_suggestions(query, detailed=False):
    return json_response(
        safe_api_call(
            get_ytmusic().get_search_suggestions,
            query,
            detailed_runs=detailed
        )
    )

# ─────────────────────────────────────────────
# 🏠 Home & Categories
# ─────────────────────────────────────────────

def get_home():
    return json_response(safe_api_call(get_ytmusic().get_home))

def get_mood_categories():
    return json_response(safe_api_call(get_ytmusic().get_mood_categories))

def get_mood_playlists(params):
    return json_response(safe_api_call(get_ytmusic().get_mood_playlists, params))

def get_charts(country):
    charts = safe_api_call(get_ytmusic().get_charts, country)
    if charts and not isinstance(charts, dict):
        for section in ["songs", "videos", "trending"]:
            if section in charts and "items" in charts[section]:
                charts[section]["items"] = [item for item in charts[section]["items"] 
                                          if isinstance(item.get("videoId"), str)]
    return json_response(charts)

# ─────────────────────────────────────────────
# 🎧 Playlist Management
# ─────────────────────────────────────────────

def create_playlist(title, description, privacy_status="PRIVATE", video_ids=None, source_playlist=None):
    return json_response(
        safe_api_call(
            get_ytmusic().create_playlist,
            title=title,
            description=description,
            privacy_status=privacy_status,
            video_ids=video_ids,
            source_playlist=source_playlist
        )
    )

def edit_playlist(playlist_id, title=None, description=None, privacy_status=None,
                  move_item=None, add_playlist_id=None, add_to_top=None):
    return json_response(
        safe_api_call(
            get_ytmusic().edit_playlist,
            playlistId=playlist_id,
            title=title,
            description=description,
            privacyStatus=privacy_status,
            moveItem=move_item,
            addPlaylistId=add_playlist_id,
            addToTop=add_to_top
        )
    )

def delete_playlist(playlist_id):
    return json_response(safe_api_call(get_ytmusic().delete_playlist, playlist_id))

def add_playlist_items(playlist_id, video_id=None, source_playlist=None, duplicates=False):
    video_ids = [video_id] if video_id is not None else []
    return json_response(
        safe_api_call(
            get_ytmusic().add_playlist_items,
            playlistId=playlist_id,
            videoIds=video_ids,
            source_playlist=source_playlist,
            duplicates=duplicates
        )
    )

def remove_playlist_items(playlist_id, video_id, setVideoId):
    video_ids = [{"videoId": video_id, "setVideoId": setVideoId}] if video_id and setVideoId else []
    return json_response(
        safe_api_call(
            get_ytmusic().remove_playlist_items,
            playlistId=playlist_id,
            videos=video_ids
        )
    )

# ─────────────────────────────────────────────
# ⭐ Library Actions
# ─────────────────────────────────────────────

def get_library_playlists():
    return json_response(safe_api_call(get_ytmusic().get_library_playlists))

def get_library_albums():
    return json_response(safe_api_call(get_ytmusic().get_library_albums))

def get_library_songs(limit=30):
    return json_response(safe_api_call(get_ytmusic().get_library_songs, limit))

def get_library_artists():
    return json_response(safe_api_call(get_ytmusic().get_library_artists))

def get_library_channels():
    return json_response(safe_api_call(get_ytmusic().get_library_channels))

def get_library_subscriptions():
    return json_response(safe_api_call(get_ytmusic().get_library_subscriptions))

def get_liked_songs(limit=50):
    return json_response(safe_api_call(get_ytmusic().get_liked_songs, limit))

def edit_song_library_status(feedbackToken):
    return json_response(safe_api_call(get_ytmusic().edit_song_library_status, feedbackToken))

def get_history():
    return json_response(safe_api_call(get_ytmusic().get_history))

def add_history(videoId):
    try:
        data = safe_api_call(get_ytmusic().get_song, videoId)
        safe_api_call(get_ytmusic().add_history_item, data)
        return json_response({"status": "ok", "videoId": videoId})
    except Exception as e:
        return json_response({"status": "error", "message": str(e)})

# ─────────────────────────────────────────────
# 🎤 Artist & Album Functions
# ─────────────────────────────────────────────
def get_account_info():
    return json_response(safe_api_call(get_ytmusic().get_account_info))

def get_artist(artist_id):
    artist_details = safe_api_call(get_ytmusic().get_artist, artist_id)
    if artist_details and not isinstance(artist_details, dict):
        artist_details["videos"] = [v for v in artist_details.get("videos", []) 
                                   if "videoId" in v and v["videoId"]]
    return json_response(artist_details)

def get_lyrics(browseId, timestamp=False):
    return json_response(safe_api_call(get_ytmusic().get_lyrics, browseId, timestamp))

# ─────────────────────────────────────────────
# ⚙️ System Functions
# ─────────────────────────────────────────────
def clear_caches():
    """Clear all caches to free memory"""
    get_song.cache_clear()
    get_album.cache_clear()
    if _yt_dlp is not None:
        _yt_dlp.YoutubeDL.cleanup()

def get_memory_usage():
    """Get current memory usage in KB"""
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
# ─────────────────────────────────────────────
# ⭐ Rating & Subscription Functions
# ─────────────────────────────────────────────

def rate_song(video_id, rating="LIKE"):
    try:
        result = safe_api_call(get_ytmusic().rate_song, video_id, rating)

        # Check if result is a tuple, convert to list or handle accordingly
        if isinstance(result, tuple):
            result = {
                "status": "success",
                "data": list(result)  # You can customize how to handle the tuple here
            }
        # If result is a dictionary, proceed as normal
        elif isinstance(result, dict):
            result = {
                "status": "success",
                "data": result  # Directly use the dictionary
            }
        else:
            result = {
                "status": "error",
                "message": "Unexpected result type"
            }

        return json_response(result)

    except Exception as e:
        return json_response({
            "status": "error",
            "message": str(e)
        })

def subscribe_artist(channel_id):
    """Optimized artist subscription with thread pooling"""
    def _subscribe():
        return get_ytmusic().subscribe_artists(channel_id)
    
    future = _EXECUTOR.submit(_subscribe)
    return json_response(future.result())

def unsubscribe_artist(channel_id):
    """Optimized artist unsubscription"""
    return json_response(
        safe_api_call(get_ytmusic().unsubscribe_artists, channel_id)
    )

# ─────────────────────────────────────────────
# 🔄 Batch Operations
# ─────────────────────────────────────────────

def batch_get_songs(song_ids):
    """
    Optimized batch fetching of songs with parallel processing
    """
    results = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_id = {
            executor.submit(get_song, song_id): song_id
            for song_id in song_ids
        }
        for future in as_completed(future_to_id):
            song_id = future_to_id[future]
            try:
                results[song_id] = future.result()
            except Exception as e:
                results[song_id] = {"error": str(e)}
    return json_response(results)

def batch_add_to_playlist(playlist_id, video_ids):
    """
    Process multiple videos in chunks to avoid timeouts
    """
    CHUNK_SIZE = 5
    results = []
    
    for i in range(0, len(video_ids), CHUNK_SIZE):
        chunk = video_ids[i:i + CHUNK_SIZE]
        result = add_playlist_items(
            playlist_id,
            video_id=None,
            source_playlist=None,
            duplicates=False
        )
        results.append(json.loads(result))
        
        # Small delay between chunks
        time.sleep(0.1)
    
    return json_response({
        "status": "completed",
        "results": results
    })

# ─────────────────────────────────────────────
# 🛠️ Diagnostic Utilities
# ─────────────────────────────────────────────

def get_cache_stats():
    """Returns cache utilization statistics"""
    return json_response({
        "song_cache": get_song.cache_info(),
        "album_cache": get_album.cache_info(),
        "memory_usage_kb": get_memory_usage()
    })

def reset_connection():
    """Full reset of connections and caches"""
    global _yt_dlp, _YTMusic, _ytmusic_instance
    
    clear_caches()
    _yt_dlp = None
    _ytmusic_instance = None
    
    # Reinitialize in background
    threading.Thread(target=warmup, daemon=True).start()
    
    return json_response({"status": "reset_complete"})

# ─────────────────────────────────────────────
# 🎛️ Configuration Management
# ─────────────────────────────────────────────

def update_ydl_options(new_options):
    """
    Dynamically update yt-dlp options with validation
    """
    global YDL_OPTIONS
    
    # Validate critical options that can't be changed
    protected_options = {
        "noplaylist": True,
        "skip_download": True,
        "quiet": True
    }
    
    for opt, val in protected_options.items():
        if opt in new_options and new_options[opt] != val:
            return json_response({
                "error": f"Cannot modify protected option: {opt}"
            })
    
    # Update options
    YDL_OPTIONS.update(new_options)
    
    # Reset yt-dlp instance to apply changes
    global _yt_dlp
    _yt_dlp = None
    
    return json_response({
        "status": "success",
        "new_options": YDL_OPTIONS
    })

# ─────────────────────────────────────────────
# 🚀 Initialization & Maintenance
# ─────────────────────────────────────────────

def periodic_cleanup():
    """
    Scheduled cleanup to maintain performance
    """
    while True:
        time.sleep(300)  # Run every 5 minutes
        clear_caches()
        
        # Reduce cache sizes if memory is high
        if get_memory_usage() > 50_000:  # 50MB threshold
            get_song.cache_clear()
            get_album.cache_clear()

# Start cleanup thread
threading.Thread(target=periodic_cleanup, daemon=True).start()

# ─────────────────────────────────────────────
# 📦 Module Export Definitions
# ─────────────────────────────────────────────

def get_module_functions():
    """Returns list of available API functions"""
    return json_response([
        "stream_music",
        "search_music",
        "get_home",
        "get_charts",
        "get_playlist",
        "get_watch_playlist",
        "get_song_details",
        "get_search_suggestions",
        "create_playlist",
        "edit_playlist",
        "delete_playlist",
        "add_playlist_items",
        "remove_playlist_items",
        "get_library_playlists",
        "get_library_albums",
        "get_library_songs",
        "get_library_artists",
        "get_library_subscriptions",
        "get_liked_songs",
        "get_history",
        "add_history",
        "rate_song",
        "subscribe_artist",
        "unsubscribe_artist",
        "batch_get_songs",
        "batch_add_to_playlist",
        "get_cache_stats",
        "reset_connection",
        "update_ydl_options"
    ])

# ─────────────────────────────────────────────
# 🏁 Final Initialization
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # Android doesn't use __main__, but kept for testing
    warmup()
    print("YouTube Music API initialized")