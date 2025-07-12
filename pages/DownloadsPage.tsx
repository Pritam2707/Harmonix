import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Text, Card, ActivityIndicator, IconButton, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { Song } from "../types/Song";

const Downloads = () => {
    const [cachedSongs, setCachedSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(false);
    const { playSong, getCachedSongs } = useMusicPlayer();
    const navigation = useNavigation();
    const theme = useTheme();

    useEffect(() => {
        const fetchCachedSongs = async () => {
            setLoading(true);
            try {
                const songs = await getCachedSongs();
                setCachedSongs(songs);
            } catch (error) {
                console.error("Error fetching cached songs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCachedSongs();
    }, []);

    const handlePlay = (filePath: string) => {
        playSong(filePath, { isLocal: true });
    };

    if (loading) {
        return (
            <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>Cached Songs</Text>
            </View>
            {cachedSongs.length === 0 ? (
                <Text style={[styles.noHistory, { color: theme.colors.onSurfaceVariant }]}>
                    No downloaded songs.
                </Text>
            ) : (
                <FlatList
                    data={cachedSongs}
                    keyExtractor={(item) => item.videoDetails.videoId}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handlePlay(item.videoDetails.videoId)} style={styles.cardContainer}>
                            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Card.Cover source={{ uri: item.videoDetails.thumbnail.thumbnails[item.videoDetails.thumbnail.thumbnails.length - 1].url }} style={styles.image} />
                                <Card.Content>
                                    <Text variant="bodyLarge" numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>
                                        {item.videoDetails.title}
                                    </Text>
                                    <Text variant="bodyMedium" numberOfLines={1} style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}>
                                        {item.videoDetails.author}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noHistory: {
        textAlign: "center",
        marginTop: 20,
    },
    row: {
        justifyContent: "space-between",
    },
    cardContainer: {
        width: "48%",
        marginBottom: 10,
    },
    card: {
        borderRadius: 12,
        overflow: "hidden",
    },
    image: {
        height: 180,
    },
    title: {
        fontWeight: "bold",
    },
    artist: {
        fontSize: 14,
        marginTop: 2,
    },
});

export default Downloads;
