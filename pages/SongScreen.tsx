import React, { useEffect, useState, useCallback, memo } from "react";
import { View, Image, ScrollView, TouchableOpacity, FlatList, Alert, NativeModules } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Text, Card, IconButton, ActivityIndicator, useTheme, MD3Theme } from "react-native-paper";
import { RootStackParamList } from "../App";
import { StackNavigationProp } from "@react-navigation/stack";
import { StyleSheet } from "react-native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";

interface SongDetails {
    title: string;
    videoId: string;
    thumbnails: { thumbnails: { url: string; width?: number; height?: number }[] };
    artists: string;
    album?: { name: string; id: string } | null;
    lyrics?: { lyrics: string };
}

interface RelatedContent {
    title: string;
    contents: Array<{
        subscribers: string | undefined;
        title: string;
        videoId?: string;
        playlistId?: string;
        browseId?: string;
        thumbnails: { url: string }[];
        artists?: { name: string; id: string }[];
    }>;
}

type SongScreenNavigationProp = StackNavigationProp<RootStackParamList, "SongDetails">;

// Memoized components to prevent unnecessary re-renders
const RelatedItemCard = memo(({
    item,
    theme,
    onPress
}: {
    item: RelatedContent['contents'][0];
    theme: MD3Theme;
    onPress: () => void;
}) => {
    return (
        <TouchableOpacity onPress={onPress} style={styles.relatedItem}>
            <Card style={[styles.relatedCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Image
                    source={{ uri: item.thumbnails?.[item.thumbnails?.length - 1]?.url || "https://via.placeholder.com/150" }}
                    style={styles.relatedImage}
                />
                <Card.Content style={styles.relatedContent}>
                    <Text
                        variant="bodyLarge"
                        numberOfLines={2}
                        style={[styles.relatedTitle, { color: theme.colors.onSurface }]}
                    >
                        {item.title}
                    </Text>
                    {item.artists && (
                        <Text
                            variant="bodySmall"
                            numberOfLines={1}
                            style={[styles.relatedArtist, { color: theme.colors.onSurface }]}
                        >
                            {item.artists.map(a => a.name).join(", ")}
                        </Text>
                    )}
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );
});

const SongDetailsPage = () => {
    const route = useRoute();
    const navigation = useNavigation<SongScreenNavigationProp>();
    const theme = useTheme();
    const { videoId } = route.params as { videoId: string };
    const { PythonModule } = NativeModules;
    const [song, setSong] = useState<SongDetails | null>(null);
    const [related, setRelated] = useState<RelatedContent[]>([]);
    const [loading, setLoading] = useState(true);
    const { playSong } = useMusicPlayer()
    const fetchSongDetails = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);
            const response = await PythonModule.getSongInfo(videoId);
            const data = JSON.parse(response);
            console.log(data)
            if (!data.error) {
                setSong({
                    title: data.title,
                    videoId: data.videoId,
                    thumbnails: data.thumbnails || { thumbnails: [] },
                    artists: data.artists || "Unknown",
                    album: data.album || null,
                    lyrics: data.lyrics || { lyrics: "No lyrics available" },
                });
                setRelated(data.related || []);
            }
        } catch (error) {
            console.error("Error fetching song details:", error);
        } finally {
            setLoading(false);
        }
    }, [videoId]);

    useEffect(() => {
        fetchSongDetails();
    }, [fetchSongDetails]);

    const handleRelatedItemPress = useCallback((item: RelatedContent['contents'][0]) => {
        if (item.videoId) {
            navigation.push("SongDetails", { videoId: item.videoId });
        } else if (item.playlistId) {
            navigation.navigate("Playlist", { playlistId: item.playlistId });
        }
        else if (item.subscribers && item.browseId)
            navigation.navigate("Artist", { artistId: item.browseId });
        else if (item.browseId)
            navigation.navigate("Album", { albumId: item.browseId });
    }, [navigation]);

    const renderRelatedSection = useCallback(({ item }: { item: RelatedContent }) => (
        item.title === "About the artist" ?
            <View style={styles.relatedSection}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    {item.title}
                </Text>


                <Text variant="bodySmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    {item.contents.toString()}
                </Text>
            </View> :
            <View style={styles.relatedSection}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    {item.title}
                </Text>
                <FlatList
                    horizontal
                    data={item.contents}
                    keyExtractor={(item, idx) => item.videoId || item.playlistId || `item-${idx}`}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <RelatedItemCard
                            item={item}
                            theme={theme}
                            onPress={() => handleRelatedItemPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.relatedList}
                    initialNumToRender={5} // Optimizing initial render
                    maxToRenderPerBatch={10}
                    windowSize={10}
                />
            </View>
    ), [theme, handleRelatedItemPress]);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!song) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                    Song not found
                </Text>
            </View>
        );
    }

    const lastThumbnail = song.thumbnails.thumbnails[song.thumbnails.thumbnails.length - 1]?.url;

    return (
        <ScrollView
            contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Card style={[styles.thumbnailCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Image
                        source={{ uri: lastThumbnail || "https://via.placeholder.com/200" }}
                        style={styles.thumbnailImage}
                    />
                </Card>

                <View style={styles.headerInfo}>
                    <Text
                        variant="titleMedium"
                        numberOfLines={2}
                        style={[styles.songTitle, { color: theme.colors.onSurface }]}
                    >
                        {song.title}
                    </Text>
                    <Text
                        variant="bodyLarge"
                        numberOfLines={1}
                        style={[styles.artistName, { color: theme.colors.onSurface }]}
                    >
                        {song.artists}
                    </Text>



                    <View style={styles.actionButtons}>
                        <IconButton
                            icon="heart"
                            iconColor={theme.colors.error}
                            size={24}
                            onPress={() => Alert.alert("Working on it")}
                        />
                        {/* <IconButton
                            icon="playlist-plus"
                            iconColor={theme.colors.onSurface}
                            size={24}
                            onPress={() => Alert.alert("Not now")}
                        /> */}
                        <IconButton
                            icon="download"
                            iconColor={theme.colors.onSurface}
                            size={24}
                            onPress={() => Alert.alert("WORKING ON IT")}
                        />
                        <IconButton
                            icon="play-circle"  // Play button icon
                            iconColor={theme.colors.onSurface}  // Set icon color based on the theme
                            size={24}  // Set the size of the icon
                            onPress={() => playSong(song.videoId)}  // Replace this with the actual functionality
                        />
                    </View>
                </View>
            </View>

            {song.lyrics && (
                <View style={styles.lyricsSection}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Lyrics
                    </Text>
                    <Text style={[styles.lyricsText, { color: theme.colors.onSurface }]}>
                        {song.lyrics.lyrics}
                    </Text>
                </View>
            )}

            <FlatList
                data={related}
                renderItem={renderRelatedSection}
                keyExtractor={(item, index) => `section-${index}`}
                scrollEnabled={false}
                ListFooterComponent={<View style={{ height: 32 }} />}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    header: {
        flexDirection: "row",
        marginBottom: 24,
    },
    thumbnailCard: {
        width: 150,
        height: 150,
        marginRight: 16,
        borderRadius: 8,
        overflow: "hidden",
    },
    thumbnailImage: {
        width: "100%",
        height: "100%",
    },
    headerInfo: {
        flex: 1,
        justifyContent: "center",
    },
    songTitle: {
        fontWeight: "bold",
        marginBottom: 4,
    },
    artistName: {
        marginBottom: 4,
    },
    albumName: {
        marginBottom: 8,
    },
    actionButtons: {
        flexDirection: "row",
        marginTop: 8,
    },
    lyricsSection: {
        marginBottom: 24,
    },
    lyricsText: {
        lineHeight: 22,
    },
    sectionTitle: {
        fontWeight: "bold",
        marginBottom: 12,
    },
    relatedSection: {
        marginBottom: 20,
    },
    relatedList: {
        paddingRight: 16,
    },
    relatedItem: {
        marginRight: 12,
        width: 150, // Same width for square aspect ratio
        height: 150, // Height equals width to make it square
    },
    relatedCard: {
        borderRadius: 8,
        overflow: "hidden",
        height: '100%', // Ensure the card takes full height
    },
    relatedImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover", // Make sure the image fills the square
    },
    relatedContent: {
        padding: 8,
    },
    relatedTitle: {
        fontWeight: "500",
        marginBottom: 4,
    },
    relatedArtist: {
        opacity: 0.8,
    },
});

export default SongDetailsPage;
