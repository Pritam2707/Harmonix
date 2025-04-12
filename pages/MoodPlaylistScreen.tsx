import React, { useEffect, useState } from "react";
import { View, Image, FlatList, TouchableOpacity, NativeModules } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Text, Card, ActivityIndicator, useTheme } from "react-native-paper";
import { RootStackParamList } from "../App";
import { StackNavigationProp } from "@react-navigation/stack";

type PlaylistScreenNavigationProp = StackNavigationProp<RootStackParamList, "MoodPlaylists">;

interface Playlist {
    playlistId: string;
    title: string;
    thumbnails: { url: string }[];
}

const MoodPlaylistsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<PlaylistScreenNavigationProp>();
    const theme = useTheme();
    const { mood } = route.params as { mood: string };
    const { PythonModule } = NativeModules;

    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMoodPlaylists = async () => {
            try {
                const response = await PythonModule.getMoodPlaylists(mood);
                setPlaylists(JSON.parse(response));
            } catch (err) {
                setError("Failed to fetch mood playlists.");
            } finally {
                setLoading(false);
            }
        };

        fetchMoodPlaylists();
    }, [mood]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
                <ActivityIndicator animating color={theme.colors.primary} size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: theme.colors.background }}>
                <Text variant="titleLarge" style={{ color: theme.colors.error, textAlign: "center", paddingHorizontal: 20 }}>
                    {error}
                </Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
            <Text variant="titleLarge" style={{ fontWeight: "bold", marginBottom: 10, color: theme.colors.onSurface }}>
                Mood Playlists
            </Text>

            <FlatList
                data={playlists}
                keyExtractor={(item) => item.playlistId}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: "space-between" }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Playlist", { playlistId: item.playlistId })}
                        activeOpacity={0.7}
                        style={{ flex: 1, margin: 8 }}
                    >
                        <Card style={{ borderRadius: 12, backgroundColor: theme.colors.surface, overflow: "hidden", elevation: 5 }}>
                            <Image
                                source={{ uri: item.thumbnails[0]?.url || "https://placehold.co/150" }}
                                style={{ width: "100%", height: 150, borderRadius: 12 }}
                                resizeMode="cover"
                            />
                            <View style={{ padding: 10 }}>
                                <Text variant="bodyMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface, lineHeight: 18 }}>
                                    {item.title}
                                </Text>
                            </View>
                        </Card>
                    </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default MoodPlaylistsScreen;
