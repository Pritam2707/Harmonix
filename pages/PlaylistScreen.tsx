import React, { useEffect, useState } from "react";
import {
    View,
    Image,
    TouchableOpacity,
    FlatList,
    Dimensions,
    NativeModules,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Text, Card, ActivityIndicator, useTheme } from "react-native-paper";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

const screenWidth = Dimensions.get("window").width;

interface Playlist {
    title: string;
    author?: string;
    thumbnails?: { url: string }[];
    description?: string;
    tracks: {
        videoId: string;
        title: string;
        artists?: { name: string; id?: string }[];
        album?: { name: string; id?: string } | null;
        duration?: string;
        thumbnails?: { url: string }[];
    }[];
}

type ArtistScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const PlaylistScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<ArtistScreenNavigationProp>();
    const theme = useTheme();
    const { playlistId } = route.params as { playlistId: string };
    const { PythonModule } = NativeModules;
    const { playSong } = useMusicPlayer();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlaylist = async () => {
            try {
                setLoading(true);
                const res = await PythonModule.getPlaylist(playlistId);
                const data = JSON.parse(res);
                setPlaylist(data);
            } catch (error) {
                console.error("Failed to fetch playlist:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylist();
    }, [playlistId]);

    const handlePlaySong = async (videoId: string) => {
        if (videoId) {
            setPlayingId(videoId);
            playSong(videoId);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!playlist) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: theme.colors.background }}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                    Playlist not found
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={playlist.tracks}
            keyExtractor={(item) => item.videoId}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 12 }}
            contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.background }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                <Card style={{ marginBottom: 20, padding: 16, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant }}>
                    <View style={{ alignItems: "center" }}>
                        <Image
                            source={{
                                uri: playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url ?? "https://placehold.co/200",
                            }}
                            style={{ width: 200, height: 200, borderRadius: 12 }}
                        />
                        <Text variant="titleLarge" style={{ fontWeight: "bold", marginTop: 10, color: theme.colors.onSurface }}>
                            {playlist.title || "Untitled Playlist"}
                        </Text>
                        {playlist.description ? (
                            <Text
                                variant="bodyMedium"
                                style={{ color: theme.colors.onSurface, textAlign: "center", marginTop: 5 }}
                            >
                                {playlist.description}
                            </Text>
                        ) : null}
                    </View>
                </Card>
            }
            renderItem={({ item }) => {
                const isPlaying = item.videoId === playingId;
                return (
                    <TouchableOpacity
                        onPress={() => handlePlaySong(item.videoId)}
                        style={{
                            width: (screenWidth - 48) / 2, // 16px padding on both sides + 16px between columns
                            aspectRatio: 1,
                        }}
                    >
                        <Card
                            style={{
                                flex: 1,
                                borderRadius: 12,
                                overflow: "hidden",
                                backgroundColor: isPlaying ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                            }}
                        >
                            <Image
                                source={{
                                    uri: item.thumbnails?.[item.thumbnails.length - 1]?.url ?? "https://placehold.co/200",
                                }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                            />
                            <View style={{ position: "absolute", bottom: 0, width: "100%", backgroundColor: "#00000088", padding: 4 }}>
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: "white",
                                        fontWeight: "bold",
                                        fontSize: 12,
                                        textAlign: "center",
                                    }}
                                >
                                    {item.title}
                                </Text>
                                {isPlaying && (
                                    <Text
                                        style={{
                                            color: theme.colors.primary,
                                            fontSize: 10,
                                            textAlign: "center",
                                            marginTop: 2,
                                        }}
                                    >
                                        🔊 Now Playing
                                    </Text>
                                )}
                            </View>
                        </Card>
                    </TouchableOpacity>
                );
            }}
        />
    );
};

export default PlaylistScreen;
