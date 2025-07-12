import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Dock from "./components/dock";
import { ThemeProviderWrapper } from "./themes";
import AudioPlayer from "./components/AudioPlayer";
import { MusicPlayerProvider } from "./hooks/useMusicPlayer";
import WelcomeScreen from "./pages/Welcome";
import AuthScreen from "./AuthScreen";
import { AuthProvider } from "./hooks/useAuth";
import History from "./pages/History";
import { playbackService } from "./services/PlaybackService";
import TrackPlayer from "react-native-track-player";
import AlbumScreen from "./pages/Album";
import ArtistScreen from "./pages/Artist";
import SongDetailsPage from "./pages/SongScreen";
import MoodPlaylistsScreen from "./pages/MoodPlaylistScreen";
import PlaylistScreen from "./pages/PlaylistScreen";
import WatchPlaylist from "./components/WatchPlaylist";
import SplashScreen from "react-native-splash-screen";
import MusicPlayerService from "./services/MusicPlayerService";
import SearchScreen from "./pages/SearchPage";
import SongScreen from "./pages/SongPage";
import Downloads from "./pages/DownloadsPage";
import { useOfflineStatus } from "./hooks/useOfflineStatus";
import OfflinePlayerPage from "./pages/OfflinePlayer.";
import { LyricsCacheProvider } from "./components/LyricsCacheContext";

// Define type for Stack Navigator
export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  App: undefined;
  History: undefined;
  Album: { albumId: string };
  Artist: { artistId: string };
  SongDetails: { videoId: string };
  MoodPlaylists: { mood: string };
  Playlist: { playlistId: string };
  WatchPlaylist: undefined;
  ArtistLibrary: undefined;
  SearchPage: { param: string }
  SongScreen: undefined;
  Downloads: undefined;
  Offline: undefined
};

const Stack = createStackNavigator<RootStackParamList>();

TrackPlayer.registerPlaybackService(() => playbackService);

export default function App() {
  const hasInitializedRef = React.useRef(false);
  const isOffline = useOfflineStatus()
  useEffect(() => {
    SplashScreen.hide();
    const setupApp = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;

      try {
        MusicPlayerService.setupPlayer();
      } catch (e) {
        console.error("App initialization failed:", e);
      }
    };

    setupApp();
  }, []);

  return (
    <ThemeProviderWrapper>
      <AuthProvider>
        <MusicPlayerProvider>
          <NavigationContainer>
            <LyricsCacheProvider>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="App" component={Dock} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="SearchPage" component={SearchScreen} />
                <Stack.Screen name="History" component={History} />
                <Stack.Screen name="Album" component={AlbumScreen} />
                <Stack.Screen name="Artist" component={ArtistScreen} />
                <Stack.Screen name="SongDetails" component={SongDetailsPage} />
                <Stack.Screen name="Playlist" component={PlaylistScreen} />
                <Stack.Screen name="MoodPlaylists" component={MoodPlaylistsScreen} />
                <Stack.Screen name="WatchPlaylist" component={WatchPlaylist} />
                <Stack.Screen name="SongScreen" component={SongScreen} />
                <Stack.Screen name="Downloads" component={Downloads} />
                <Stack.Screen name="Offline" component={OfflinePlayerPage} />

              </Stack.Navigator>

              <AudioPlayer />
            </LyricsCacheProvider>
          </NavigationContainer>
        </MusicPlayerProvider>
      </AuthProvider>
    </ThemeProviderWrapper>
  );
}
