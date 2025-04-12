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

    private fun callPythonFunction(functionName: String, promise: Promise, vararg args: Any) {
        launch {
            try {
                Log.d("ReactNativeJS", "Calling $functionName with args: ${args.joinToString()}")
                val startTime = System.currentTimeMillis()

                val function = functionCache.getOrPut(functionName) {
                    pyModule.get(functionName) ?: throw IllegalStateException("Function $functionName not found in Python module")
                }
                
                val result = function.call(*args).toJava(String::class.java)

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
