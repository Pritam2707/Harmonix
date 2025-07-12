package com.harmonix

import android.util.Log
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext

class PythonModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), CoroutineScope {

    private val job = SupervisorJob()
    private val coroutineExceptionHandler = CoroutineExceptionHandler { _, e ->
        Log.e("ReactNativeJS", "Coroutine error: ", e)
    }
    override val coroutineContext: CoroutineContext = Dispatchers.IO + job + coroutineExceptionHandler

    override fun getName(): String = "PythonModule"

    private val pythonInstance: Python by lazy {
        if (!Python.isStarted()) {
            Python.start(AndroidPlatform(reactApplicationContext))
        }
        Python.getInstance()
    }

    private val pyModule: com.chaquo.python.PyObject by lazy {
        pythonInstance.getModule("index")  // Replace "index" with the name of your Python module
    }

    private val functionCache = mutableMapOf<String, com.chaquo.python.PyObject>()

    // This is where you call the warmup function when the class is instantiated
    init {
        warmup()
    }

    // Warmup method to be called during the initialization of the module
    private fun warmup() {
        launch {
            try {
                Log.d("ReactNativeJS", "Calling warmup function")

                val startTime = System.currentTimeMillis()

                // Call the warmup function in Python
                val function = pyModule.get("warmup") ?: throw IllegalStateException("warmup function not found in Python module")
                val result = function.call().toJava(String::class.java)

                val duration = System.currentTimeMillis() - startTime

                Log.d("ReactNativeJS", "Warmup completed in $duration ms: $result")
            } catch (e: Exception) {
                Log.e("ReactNativeJS", "Error during warmup", e)
            }
        }
    }

    // Exposed React Methods
    @ReactMethod fun getHomeData(promise: Promise) = callPythonFunction("get_home", promise)
    @ReactMethod fun getMoodCategories(promise: Promise) = callPythonFunction("get_mood_categories", promise)
    @ReactMethod fun getMoodPlaylists(params: String, promise: Promise) = callPythonFunction("get_mood_playlists", promise, params)
    @ReactMethod fun getCharts(country: String, promise: Promise) = callPythonFunction("get_charts", promise, country)
    @ReactMethod fun searchMusic(query: String, promise: Promise) = callPythonFunction("search_music", promise, query)
    @ReactMethod fun getAccountInfo(promise: Promise) = callPythonFunction("get_account_info", promise)
    @ReactMethod fun getArtist(artistId: String, promise: Promise) = callPythonFunction("get_artist", promise, artistId)
    @ReactMethod fun getSong(songId: String, promise: Promise) = callPythonFunction("get_song", promise, songId)
    @ReactMethod fun getAlbum(albumId: String, promise: Promise) = callPythonFunction("get_album", promise, albumId)
    @ReactMethod fun getPlaylist(playlistId: String, promise: Promise) = callPythonFunction("get_playlist", promise, playlistId)
    @ReactMethod fun getWatchPlaylist(videoId: String, promise: Promise) = callPythonFunction("get_watch_playlist", promise, videoId)
    @ReactMethod fun getSearchSuggestions(query: String, detailed: Boolean, promise: Promise) = callPythonFunction("get_search_suggestions", promise, query, detailed)
    @ReactMethod fun streamMusic(videoId: String, promise: Promise) = callPythonFunction("stream_music", promise, videoId)
    @ReactMethod fun addHistory(videoId: String, promise: Promise) = callPythonFunction("add_history", promise, videoId)
    @ReactMethod fun getSongInfo(videoId: String, promise: Promise) = callPythonFunction("get_song_details", promise, videoId)
    @ReactMethod fun loadCookie(promise: Promise) = callPythonFunction("load_browser_data", promise)
    @ReactMethod fun subscribeArtist(channelId: String, promise: Promise) = callPythonFunction("subscribe_artist", promise, channelId)
    @ReactMethod fun unsubscribeArtist(channelId: String, promise: Promise) = callPythonFunction("unsubscribe_artist", promise, channelId)
    @ReactMethod fun addOrRemoveFromLibrary(feedbackToken: String, promise: Promise) = callPythonFunction("edit_song_library_status", promise, feedbackToken)
    @ReactMethod fun getLikedSong(limit: Int, promise: Promise) = callPythonFunction("get_liked_songs", promise, limit)
    @ReactMethod fun getLibrarySubscriptions(promise: Promise) = callPythonFunction("get_library_subscriptions", promise)
    @ReactMethod fun getLibraryChannels(promise: Promise) = callPythonFunction("get_library_channels", promise)
    @ReactMethod fun getLibraryArtists(promise: Promise) = callPythonFunction("get_library_artists", promise)
    @ReactMethod fun getLibrarySongs(limit: Int, promise: Promise) = callPythonFunction("get_library_songs", promise, limit)  
    @ReactMethod fun getLibraryPlaylists(promise: Promise) = callPythonFunction("get_library_playlists", promise)
    @ReactMethod fun getLibraryAlbums(promise: Promise) = callPythonFunction("get_library_albums", promise)
    @ReactMethod fun getBrowse(browseId:String,promise: Promise) = callPythonFunction("get_browse", promise,browseId)
    @ReactMethod fun rateSong(videoId: String, rating: String, promise: Promise) = callPythonFunction("rate_song", promise, videoId, rating)
    @ReactMethod fun getLyrics(lyric_id:String?,timestamp:Boolean, promise: Promise) = callPythonFunction("get_lyrics", promise, lyric_id,timestamp)
    @ReactMethod fun createPlaylist(
        title: String,
        description: String,
        privacyStatus: String,
        videoIds: ReadableArray?,
        sourcePlaylist: String?,
        promise: Promise
    ) = callPythonFunction("create_playlist", promise, title, description, privacyStatus, videoIds, sourcePlaylist)
    
    @ReactMethod fun editPlaylist(
        playlistId: String,
        title: String?,
        description: String?,
        privacyStatus: String?,
        moveItem: ReadableMap?, // or ReadableArray if it's a tuple
        addPlaylistId: String?,
        addToTop: Boolean?,
        promise: Promise
    ) = callPythonFunction("edit_playlist", promise, playlistId, title, description, privacyStatus, moveItem, addPlaylistId, addToTop)
    
    @ReactMethod fun deletePlaylist(
        playlistId: String,
        promise: Promise
    ) = callPythonFunction("delete_playlist", promise, playlistId)
    
    @ReactMethod fun addPlaylistItems(
        playlistId: String,
        videoId: String,
        sourcePlaylist: String?,
        duplicates: Boolean,
        promise: Promise
    ) = callPythonFunction("add_playlist_items", promise, playlistId, videoId, sourcePlaylist, duplicates)
    
    @ReactMethod fun removePlaylistItems(
        playlistId: String,
        video:String , // array of { videoId, setVideoId }
        setVideoId:String,
        promise: Promise
    ) = callPythonFunction("remove_playlist_items", promise, playlistId, video,setVideoId)
    


    private fun callPythonFunction(functionName: String, promise: Promise, vararg args: Any?) {
        launch {
            try {
                Log.d("ReactNativeJS", "Calling $functionName with args: ${args.joinToString()}")
    
                val startTime = System.currentTimeMillis()
    
                val function = functionCache.getOrPut(functionName) {
                    pyModule.get(functionName) ?: throw IllegalStateException("Function $functionName not found in Python module")
                }
    
                // Convert null to Python None
                val pythonArgs = args.map {
                    it ?: pythonInstance.getBuiltins().get("None")
                }.toTypedArray()
    
                val result = function.call(*pythonArgs).toJava(String::class.java)
    
                val duration = System.currentTimeMillis() - startTime
    
                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                    sendLogToJS(functionName, duration)
                }
            } catch (e: Exception) {
                Log.e("ReactNativeJS", "Error in $functionName", e)
                withContext(Dispatchers.Main) {
                    promise.reject("PYTHON_ERROR", e.message, e)
                }
            }
        }
    }
    
    private fun sendLogToJS(functionName: String, duration: Long) {
        val emitter = reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        emitter.emit("ReactNative", "$functionName executed in ${duration}ms")
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        job.cancel()
    }
}
