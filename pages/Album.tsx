import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    Image,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    NativeModules,
    Dimensions
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { useMusicPlayer } from "../hooks/useMusicPlayer";

const FALLBACK_IMAGE = "https://placehold.co/300";
const CARD_SPACING = 12;
const NUM_COLUMNS = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_SIZE = (SCREEN_WIDTH - CARD_SPACING * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

interface Track {
    videoId: string;
    title: string;
    artists: { name: string; id: string }[];
    album?: string;
    duration?: string;
    isExplicit?: boolean;
    thumbnails?: { url: string }[];
}

interface Album {
    title: string;
    type?: string;
    thumbnails?: { url: string }[];
    description?: string;
    artists: { name: string; id: string }[];
    year?: string;
    trackCount?: number;
    duration?: string;
    tracks: Track[];
}

type AlbumRouteParams = {
    albumId?: string;
};

const AlbumScreen = () => {
    const { PythonModule } = NativeModules;
    const { colors } = useTheme();
    const route = useRoute<RouteProp<Record<string, AlbumRouteParams>, string>>();
    const { albumId } = route.params ?? {};
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const { playSong } = useMusicPlayer();

    useEffect(() => {
        const fetchAlbum = async () => {
            if (!albumId) {
                console.warn("No albumId provided");
                setLoading(false);
                return;
            }

            try {
                const response = await PythonModule.getAlbum(albumId);
                const data = JSON.parse(response);

                const tracksWithThumbs = await Promise.all(
                    data.tracks.map(async (track: Track) => {
                        try {
                            const t = await PythonModule.getSong(track.videoId);
                            const details = JSON.parse(t);
                            return {
                                ...track,
                                thumbnails: details?.videoDetails?.thumbnail?.thumbnails ?? [],
                            };
                        } catch {
                            return track;
                        }
                    })
                );

                setAlbum({ ...data, tracks: tracksWithThumbs });
            } catch (e) {
                console.error("Album load failed:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbum();
    }, [albumId]);

    const renderTrack = useCallback(({ item }: { item: Track }) => (
        <TouchableOpacity
            onPress={() => item.videoId && playSong(item.videoId)}
            style={{
                width: CARD_SIZE,
                height: CARD_SIZE + 50,
                marginBottom: CARD_SPACING,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 8,
                alignItems: "center",
                justifyContent: "flex-start",
            }}
        >
            <Image
                source={{ uri: item.thumbnails?.[item.thumbnails.length - 1]?.url ?? FALLBACK_IMAGE }}
                style={{
                    width: CARD_SIZE - 16,
                    height: CARD_SIZE - 16,
                    borderRadius: 10,
                    resizeMode: "cover",
                }}
            />
            <Text
                style={{
                    color: colors.onSurface,
                    fontWeight: "bold",
                    marginTop: 6,
                    textAlign: "center",
                    fontSize: 12,
                }}
                numberOfLines={1}
            >
                {item.title}
            </Text>
            <Text
                style={{
                    color: colors.onSurface,
                    fontSize: 10,
                    textAlign: "center",
                }}
                numberOfLines={1}
            >
                {item.artists?.map((a) => a.name).join(", ") ?? ""}
            </Text>
        </TouchableOpacity>
    ), [colors, playSong]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!album) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
                <Text style={{ color: colors.onSurface }}>Album not found.</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: CARD_SPACING }}>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Image
                    source={{ uri: album.thumbnails?.[album.thumbnails.length - 1]?.url ?? FALLBACK_IMAGE }}
                    style={{ width: 200, height: 200, borderRadius: 16 }}
                />
                <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.onSurface, marginTop: 12 }}>
                    {album.title}
                </Text>
                <Text style={{ color: colors.onSurface }}>
                    {album.artists?.map((a) => a.name).join(", ")} • {album.year}
                </Text>
                <Text style={{ color: colors.onSurface, fontSize: 12 }}>
                    {album.trackCount} tracks • {album.duration}
                </Text>
            </View>

            <FlatList
                data={album.tracks}
                renderItem={renderTrack}
                keyExtractor={(item) => item.videoId}
                numColumns={NUM_COLUMNS}
                columnWrapperStyle={{ justifyContent: "space-between" }}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={6}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews
                ListEmptyComponent={() => (
                    <Text style={{ color: colors.onSurface, textAlign: "center", marginTop: 20 }}>
                        No tracks found.
                    </Text>
                )}
            />
        </View>
    );
};

export default AlbumScreen;
