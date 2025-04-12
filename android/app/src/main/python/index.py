import os
import threading
import time
import json  # Faster than json
from functools import lru_cache
# from ytmusicapi import YTMusic  # YouTube Music API
# import yt_dlp  # YouTube Downloader

yt_dlp = None
YTMusic = None



# ─────────────────────────────────────────────
# 📂 File Paths
# ─────────────────────────────────────────────
BROWSER_JSON = "/data/user/0/com.harmonix/files/browser.json"
COOKIE_FILE = "/data/user/0/com.harmonix/files/cookies.txt"
NETSCAPE_COOKIE_FILE = "/data/user/0/com.harmonix/files/cookies_netscape.txt"

# ─────────────────────────────────────────────
# 🔧 yt_dlp Options
# ─────────────────────────────────────────────
YDL_OPTIONS = {
    "noplaylist": True,
    "skip_download": True,
    # "quiet": True,  # Suppresses output logs (faster)
    "no_warnings": True,
    "nocheckcertificate": True,
    "cachedir": False,
    "retries": 0,
    "force-ipv4": True,
    "simulate": True,
    "format": "bestaudio[abr<=128]",
    "extractor_args": {
        "youtube": {
            "skip": ["hls", "dash", "translated_subs","thumbnails"],  # Skip heavy formats
            "player_client": ["android"],  # Faster than TV/iOS API
            "player_skip": ["configs", "webpage"],  # Skip unnecessary requests
        }
    },
    "http_headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",  # Generic UA (faster)
    },
    "socket_timeout": 2,  # Lower timeout (default 10s is too slow)
    "extract_flat": "in_playlist",  # Skip full extractor if possible
    "load_info_interval": 0,
    "ignore_no_formats_error": True,
    "lazy_extractors": True,
    "dns": "8.8.8.8",  # Fast Google DNS
    "geo_bypass": True,  # Bypass geo-restrictions faster
}

# ─────────────────────────────────────────────
# 🚀 Initialization
# ─────────────────────────────────────────────
def warmup():
    return "Python is ready"
def convert_cookies_to_netscape(input_file=COOKIE_FILE, output_file=NETSCAPE_COOKIE_FILE):
    """Convert a plain-text cookie file to Netscape format for yt-dlp."""
    if not os.path.exists(input_file):
        print(f"❌ Cookie file '{input_file}' not found!")
        return False

    with open(input_file, "r") as f:
        lines = f.read().splitlines()  # ✅ Read all lines at once (faster)

    netscape_cookies = ["# Netscape HTTP Cookie File\n"]
    
    for line in lines:
        if "=" not in line:  # ✅ Skip empty/invalid lines
            continue
        key, value = line.split("=", 1)
        netscape_cookies.append(f".music.youtube.com\tTRUE\t/\tTRUE\t2147483647\t{key}\t{value}\n")

    # ✅ Batch write to file (faster than writing line by line)
    with open(output_file, "w") as f:
        f.write("".join(netscape_cookies))

    # print(f"✅ Converted cookies saved to '{output_file}'")
    return output_file

# ✅ Load cookies & headers from browser.json
def load_browser_data():
    if not os.path.exists(BROWSER_JSON):
        return None
        
    with open(BROWSER_JSON, 'rb') as f:  # Binary mode for faster reads
        data = json.load(f)
    
    if "Cookie" not in data:
        return None
        
    # Single write operation
    with open(COOKIE_FILE, 'w') as f:
        f.write(data["Cookie"].replace("; ", "\n"))
    
    return convert_cookies_to_netscape()

if os.path.exists(BROWSER_JSON) and not os.path.exists(NETSCAPE_COOKIE_FILE):
    load_browser_data()

ytmusic = None
def get_ydl():
    global yt_dlp
    if yt_dlp is None:
        import yt_dlp as _yt_dlp
        yt_dlp = _yt_dlp
    return yt_dlp.YoutubeDL(YDL_OPTIONS)

# Optional warm-up only if needed later
def warmup_ydl():
    try:
        get_ydl().extract_info("https://www.youtube.com/watch?v=MvsAesQ-4zA", download=False)
        # print("🔥 yt_dlp warmed up.")
    except Exception as e:
        print(f"❌ yt_dlp warmup failed: {e}")
        
def background_warmup():
    try:
        warmup_ydl()
    except Exception as e:
        print("yt_dlp background warmup failed:", e)

def initialize_ytmusic():
    global ytmusic, YTMusic
    if ytmusic is None:
        if YTMusic is None:
            from ytmusicapi import YTMusic as _YTMusic
            YTMusic = _YTMusic
        if os.path.exists(BROWSER_JSON):
            ytmusic = YTMusic(BROWSER_JSON)
            # print("✅ YTMusic API initialized.")

initialize_ytmusic()
threading.Thread(target=background_warmup, daemon=True).start()
def ensure_ytmusic():
    if ytmusic is None:
        initialize_ytmusic()
    if ytmusic is None:
        raise RuntimeError("❌ YTMusic not initialized")
    return ytmusic

def json_response(data):
    return json.dumps(data)

# ─────────────────────────────────────────────
# 🎧 Stream Audio
# ─────────────────────────────────────────────
def stream_music(video_id):
    start_time = time.time()
    # print(f"⏱️ [0ms] stream_music called with video_id: {video_id}", flush=True)

    try:
        info = get_ydl().extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False, process=False)
        streaming_url = info.get('url') or info.get('formats')[0]['url']
        if not info or not streaming_url:
            # print(f"❌ [{int((time.time() - start_time)*1000)}ms] Failed to get stream URL.", flush=True)
            return json.dumps({"error": "❌ Failed to extract stream URL."})
        # print(f"✅ [Total: {int((time.time() - start_time)*1000)}ms] stream_music finished.", flush=True)
        return json.dumps({"url": streaming_url})

    except Exception as e:
        # print(f"❌ [{int((time.time() - start_time)*1000)}ms] Error: {str(e)}", flush=True)
        return json.dumps({"error": f"❌ {str(e)}"})

# ─────────────────────────────────────────────
# 🏠 Home & Categories
# ─────────────────────────────────────────────
def get_home():
    return json_response(ensure_ytmusic().get_home())

def get_mood_categories():
    return json_response(ensure_ytmusic().get_mood_categories())

def get_mood_playlists(params):
    return json_response(ensure_ytmusic().get_mood_playlists(params))

def get_charts(country):
    charts = ensure_ytmusic().get_charts(country)
    for section in ["songs", "videos", "trending"]:
        if section in charts and "items" in charts[section]:
            charts[section]["items"] = filter_valid_videos(charts[section]["items"])
    return json_response(charts)

def filter_valid_videos(items):
    return [item for item in items if isinstance(item.get("videoId"), str) and item["videoId"].strip()]

# ─────────────────────────────────────────────
# 🔍 Search & Suggestions
# ─────────────────────────────────────────────
def search_music(query):
    # print(f"🔍 Searching for: {query}")
    ytm = ensure_ytmusic()
    results = (
        ytm.search(query, limit=10, filter="songs", ignore_spelling=True) +
        ytm.search(query, limit=10, filter="videos", ignore_spelling=True) +
        ytm.search(query, limit=5, filter="artists", ignore_spelling=True) +
        ytm.search(query, limit=5, filter="albums", ignore_spelling=True)
    )
    return json_response(results)

def get_search_suggestions(query, detailed=False):
    return json_response(ensure_ytmusic().get_search_suggestions(query, detailed_runs=detailed))

# ─────────────────────────────────────────────
# 📄 Metadata & Details
# ─────────────────────────────────────────────
def get_account_info():
    return json_response(ensure_ytmusic().get_account_info())

def get_artist(artist_id):
    artist_details = ensure_ytmusic().get_artist(artist_id)
    artist_details["videos"] = [v for v in artist_details.get("videos", []) if "videoId" in v and v["videoId"]]
    return json_response(artist_details)
@lru_cache(maxsize=64)
def get_song(song_id):
    return json_response(ensure_ytmusic().get_song(song_id))
@lru_cache(maxsize=64)
def get_album(album_id):
    return json_response(ensure_ytmusic().get_album(album_id))

def get_playlist(playlist_id):
    return json_response(ensure_ytmusic().get_playlist(playlist_id))

def get_watch_playlist(video_id=None):
    try:
        playlist = ensure_ytmusic().get_watch_playlist(videoId=video_id, limit=10)
        return json_response(playlist)
    except Exception as e:
        return json_response({"error": str(e)})

def get_song_details(video_id):
    try:
        watch_playlist = ensure_ytmusic().get_watch_playlist(video_id)
        if not watch_playlist or "tracks" not in watch_playlist:
            return json_response({"error": "Invalid or non-music video ID"})

        song = ensure_ytmusic().get_song(video_id)
        related_id = watch_playlist.get("related")
        lyrics_id = watch_playlist.get("lyrics")

        response_data = {
            "title": song.get("videoDetails", {}).get("title"),
            "videoId": video_id,
            "artists": song.get("videoDetails", {}).get("author"),
            "thumbnails": song.get("videoDetails", {}).get("thumbnail"),
            "album": song.get("album"),
            "duration": song.get("videoDetails", {}).get("lengthSeconds"),
            "lyrics": ensure_ytmusic().get_lyrics(lyrics_id) if lyrics_id else None,
            "related": ensure_ytmusic().get_song_related(related_id) if related_id else None
        }

        return json_response(response_data)

    except Exception as e:
        print(f"Error fetching song {video_id}: {str(e)}")
        return json_response({"error": str(e)})

# ─────────────────────────────────────────────
# 🕓 History
# ─────────────────────────────────────────────
def add_history(videoId):
    data = ensure_ytmusic().get_song(videoId)
    response = ensure_ytmusic().add_history_item(data)

    if response.status_code == 204:
        message = "History item added successfully"
    else:
        message = f"Unexpected response: {response.status_code}"

    return json_response({"status": "success", "message": message})
# ─────────────────────────────────────────────
# ➕ Playlist Management
# ─────────────────────────────────────────────
def create_playlist(title, description="", video_ids=None, privacy_status="PRIVATE"):
    video_ids = video_ids or []
    return json_response(ensure_ytmusic().create_playlist(title, description, video_ids, privacy_status))

def add_to_playlist(playlist_id, video_ids):
    return json_response(ensure_ytmusic().add_playlist_items(playlist_id, video_ids))

def remove_from_playlist(playlist_id, video_ids):
    return json_response(ensure_ytmusic().remove_playlist_items(playlist_id, [{"videoId": vid} for vid in video_ids]))

# ─────────────────────────────────────────────
# 📚 Library Actions
# ─────────────────────────────────────────────
def rate_song(video_id, rating="LIKE"):
    # Ratings: 'LIKE', 'DISLIKE', 'INDIFFERENT'
    return json_response(ensure_ytmusic().rate_song(video_id, rating))

def subscribe_artist(channel_id):
    return json_response(ensure_ytmusic().subscribe_artists(channel_id))

def get_library_playlists():
    return json_response(ensure_ytmusic().get_library_playlists())

def get_library_songs(limit=100):
    return json_response(ensure_ytmusic().get_library_songs(limit=limit))

def get_liked_songs(limit=100):
    return json_response(ensure_ytmusic().get_liked_songs(limit=limit))

def get_history():
    return json_response(ensure_ytmusic().get_history())
