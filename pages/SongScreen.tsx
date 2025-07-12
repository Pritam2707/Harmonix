import React, { useEffect, useState, useCallback, memo, useRef } from "react";
import {
    View,
    Image,
    ScrollView,
    FlatList,
    Alert,
    NativeModules,
    StyleSheet,
    Animated,
    Dimensions,
    RefreshControl,
    Share
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
    Text,
    Card,
    IconButton,
    ActivityIndicator,
    useTheme,
    MD3Theme,
    Modal,
    Portal,
    Button,
    TouchableRipple
} from "react-native-paper";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "../App";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
// import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = width * 0.35;
const shareSong = async (videoId: string) => {
    const shareUrl = `https://music.youtube.com/watch?v=${videoId}`;
    try {
        await Share.share({
            message: `Check out this song! 🎶\n${shareUrl}`,
            url: shareUrl, // optional for iOS
            title: 'Harmonix',
        });
    } catch (error) {
        console.error('Error sharing:', error);
    }
};
interface SongDetails {
    title: string;
    videoId: string;
    thumbnails: { thumbnails: { url: string; width?: number; height?: number }[] };
    artists: string;
    album?: { name: string; id: string } | null;
    lyrics?: { lyrics: string };
    track: {
        likeStatus: string;
    }
}

interface RelatedContent {
    title: string;
    contents: Array<{
        subscribers?: string;
        title: string;
        videoId?: string;
        playlistId?: string;
        browseId?: string;
        thumbnails: { url: string }[];
        artists?: { name: string; id: string }[];
    }>;
}

type SongScreenNavigationProp = StackNavigationProp<RootStackParamList, "SongDetails">;

const RelatedItemCard = memo(({
    item,
    theme,
    onPress
}: {
    item: RelatedContent['contents'][0];
    theme: MD3Theme;
    onPress: () => void;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableRipple
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.relatedItem}
                rippleColor={theme.colors.primary}
                borderless
            >
                <Card style={[styles.relatedCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Image
                        source={{ uri: item.thumbnails?.[0]?.url || "https://via.placeholder.com/150" }}
                        style={styles.relatedImage}
                        resizeMode="cover"
                    />
                    <Card.Content style={styles.relatedContent}>
                        <Text
                            variant="bodyMedium"
                            numberOfLines={1}
                            style={[styles.relatedTitle, { color: theme.colors.onSurface }]}
                            ellipsizeMode="tail"
                        >
                            {item.title}
                        </Text>
                        {item.artists && (
                            <Text
                                variant="bodySmall"
                                numberOfLines={1}
                                style={[styles.relatedArtist, { color: theme.colors.onSurfaceVariant }]}
                                ellipsizeMode="tail"
                            >
                                {item.artists.map(a => a.name).join(", ")}
                            </Text>
                        )}
                    </Card.Content>
                </Card>
            </TouchableRipple>
        </Animated.View>
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
    const [refreshing, setRefreshing] = useState(false);
    const { playSong, downloadSong } = useMusicPlayer();
    const [isLiked, setIsLiked] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const openPlaylistModal = () => setModalVisible(true);
    const closePlaylistModal = () => setModalVisible(false);

    const handleLike = useCallback(async () => {
        if (!song) return;
        const newLikeStatus = !isLiked;
        setIsLiked(newLikeStatus);

        try {
            console.log("liking", song.videoId);

            const res = await PythonModule.rateSong(
                song.videoId,
                newLikeStatus ? "LIKE" : "INDIFFERENT"
            );
            console.log(res)
        } catch (error) {
            console.error("Error rating song:", error);
            setIsLiked(!newLikeStatus);
        }
    }, [song, isLiked]);

    const handleAddToPlaylist = useCallback(async (playlistId: string) => {
        if (!playlistId) return;

        try {
            await PythonModule.addPlaylistItems(playlistId, videoId, null, false);
            closePlaylistModal();
            Alert.alert("Success", "Song added to playlist!");
        } catch (err) {
            console.error("Error adding to playlist:", err);
            Alert.alert("Error", "Could not add to playlist.");
        }
    }, [videoId]);

    const fetchSongDetails = useCallback(async () => {
        if (!videoId) return;

        try {
            setLoading(true);
            const response = await PythonModule.getSongInfo(videoId);
            const data = JSON.parse(response);

            if (!data.error) {
                setSong({
                    title: data.title,
                    videoId: data.videoId,
                    thumbnails: data.thumbnails || { thumbnails: [] },
                    artists: data?.artists || "Unknown",
                    album: data.album || null,
                    lyrics: data.lyrics || { lyrics: "No lyrics available" },
                    track: data.track
                });
                console.log(data)
                setRelated(data.related || []);
                setIsLiked(data.track.likeStatus === "LIKE");
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            }
        } catch (error) {
            console.error("Error fetching song details:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [videoId]);

    const fetchLibraryPlaylists = useCallback(async () => {
        try {
            const playlists = JSON.parse(await PythonModule.getLibraryPlaylists());
            setPlaylists(playlists.filter((playlist: any) => (
                playlist.playlistId !== "LM" && playlist.playlistId !== "SE"
            )));
        } catch (error) {
            console.error("Error fetching playlists:", error);
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSongDetails();
    }, [fetchSongDetails]);

    useEffect(() => {
        fetchSongDetails();
        fetchLibraryPlaylists();
    }, [fetchSongDetails, fetchLibraryPlaylists]);

    const handleRelatedItemPress = useCallback((item: RelatedContent['contents'][0]) => {
        if (item.videoId) {
            navigation.push("SongDetails", { videoId: item.videoId });
        } else if (item.playlistId) {
            navigation.navigate("Playlist", { playlistId: item.playlistId });
        } else if (item.browseId) {
            if (item.subscribers) {
                navigation.navigate("Artist", { artistId: item.browseId });
            } else {
                navigation.navigate("Album", { albumId: item.browseId });
            }
        }
    }, [navigation]);

    const renderRelatedSection = useCallback(({ item }: { item: RelatedContent }) => (
        <View style={styles.relatedSection}>
            <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {item.title}
            </Text>
            {item.title === "About the artist" ? (
                <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                >
                    {item.contents[0]?.title || "No artist information available"}
                </Text>
            ) : (
                <FlatList
                    horizontal
                    data={item.contents}
                    keyExtractor={(item, idx) =>
                        item.videoId || item.playlistId || item.browseId || `item-${idx}`
                    }
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <RelatedItemCard
                            item={item}
                            theme={theme}
                            onPress={() => handleRelatedItemPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.relatedList}
                    initialNumToRender={3}
                    maxToRenderPerBatch={5}
                    windowSize={7}
                    removeClippedSubviews={true}
                />
            )}
        </View>
    ), [theme, handleRelatedItemPress]);

    const handleDownload = useCallback(() => {
        if (!song) return;
        downloadSong(videoId, song.title);
        Alert.alert("Download started");
    }, [song, videoId, downloadSong]);

    const handlePlay = useCallback(() => {
        if (!song) return;
        playSong(song.videoId, {});
    }, [song, playSong]);

    if (loading && !refreshing) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!song) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
                <MaterialCommunityIcons
                    name="music-off"
                    size={48}
                    color={theme.colors.error}
                    style={styles.errorIcon}
                />
                <Text variant="titleLarge" style={[styles.errorText, { color: theme.colors.onSurface }]}>
                    Song not found
                </Text>
                <Button
                    mode="contained"
                    onPress={fetchSongDetails}
                    style={styles.retryButton}
                >
                    Try Again
                </Button>
            </View>
        );
    }

    const thumbnailUrl = song.thumbnails.thumbnails[song.thumbnails.thumbnails.length - 1]?.url;

    return (
        <Animated.ScrollView
            contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.primary]}
                    tintColor={theme.colors.primary}
                />
            }
            style={{ opacity: fadeAnim }}
        >
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={closePlaylistModal}
                    contentContainerStyle={[
                        styles.modalContainer,
                        {
                            backgroundColor: theme.colors.surface,
                            margin: 20,
                            borderRadius: 12
                        }
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <Text
                            variant="titleLarge"
                            style={[styles.modalTitle, { color: theme.colors.onSurface }]}
                        >
                            Add to Playlist
                        </Text>
                        <IconButton
                            icon="close"
                            onPress={closePlaylistModal}
                            style={styles.modalCloseButton}
                        />
                    </View>

                    <FlatList
                        data={playlists}
                        keyExtractor={(item: any) => item.playlistId}
                        renderItem={({ item }) => (
                            <TouchableRipple
                                onPress={() => handleAddToPlaylist(item.playlistId)}
                                style={[
                                    styles.playlistItem,
                                    { borderBottomColor: theme.colors.outline },
                                ]}
                                rippleColor={theme.colors.primaryContainer}
                            >
                                <View style={styles.playlistContent}>
                                    {item.thumbnails?.length > 0 && (
                                        <Image
                                            source={{ uri: item.thumbnails[item.thumbnails.length - 1].url }}
                                            style={styles.playlistThumbnail}
                                        />
                                    )}
                                    <View style={styles.playlistTextContainer}>
                                        <Text
                                            variant="bodyLarge"
                                            style={{ color: theme.colors.onSurface }}
                                            numberOfLines={1}
                                        >
                                            {item.title}
                                        </Text>
                                        <Text
                                            variant="bodySmall"
                                            style={{ color: theme.colors.onSurfaceVariant }}
                                        >
                                            {item.count} songs
                                        </Text>
                                    </View>
                                </View>
                            </TouchableRipple>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyPlaylists}>
                                <MaterialCommunityIcons
                                    name="playlist-music"
                                    size={48}
                                    color={theme.colors.onSurfaceVariant}
                                />
                                <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                                    No playlists found
                                </Text>
                            </View>
                        }
                    />

                    <Button
                        mode="contained"
                        onPress={closePlaylistModal}
                        style={styles.modalButton}
                        labelStyle={styles.modalButtonLabel}
                    >
                        Close
                    </Button>
                </Modal>
            </Portal>

            <View style={styles.header}>
                <Animated.View
                    style={[
                        styles.thumbnailContainer,
                        {
                            shadowColor: theme.colors.onSurface,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 6,
                        }
                    ]}
                >
                    <Image
                        source={{ uri: thumbnailUrl || "https://via.placeholder.com/300" }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                    />
                    {/* <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.thumbnailGradient}
                    /> */}
                </Animated.View>

                <View style={styles.headerInfo}>
                    <Text
                        variant="titleLarge"
                        numberOfLines={2}
                        style={[styles.songTitle, { color: theme.colors.onSurface }]}
                        ellipsizeMode="tail"
                    >
                        {song.title}
                    </Text>
                    <Text
                        variant="bodyLarge"
                        numberOfLines={1}
                        style={[styles.artistName, { color: theme.colors.onSurfaceVariant }]}
                        ellipsizeMode="tail"
                    >
                        {song.artists}
                    </Text>
                    {song.album && (
                        <Text
                            variant="bodyMedium"
                            style={[styles.albumName, { color: theme.colors.onSurfaceVariant }]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {song.album.name}
                        </Text>
                    )}

                    <View style={styles.actionButtons}>
                        <IconButton
                            icon={isLiked ? "heart" : "heart-outline"}
                            iconColor={isLiked ? theme.colors.error : theme.colors.onSurface}
                            size={24}
                            onPress={handleLike}
                            style={styles.actionButton}
                        />
                        <IconButton
                            icon="share"
                            iconColor={theme.colors.onSurface}
                            size={24}
                            onPress={() => shareSong(song.videoId)}
                            style={styles.actionButton}
                        />
                        <IconButton
                            icon="download"
                            iconColor={theme.colors.onSurface}
                            size={24}
                            onPress={handleDownload}
                            style={styles.actionButton}
                        />
                        <IconButton
                            icon="play-circle"
                            iconColor={theme.colors.primary}
                            size={24}
                            onPress={handlePlay}
                            style={styles.actionButton}
                        />
                        <IconButton
                            icon="playlist-plus"
                            iconColor={theme.colors.onSurface}
                            size={24}
                            onPress={openPlaylistModal}
                            style={styles.actionButton}
                        />
                    </View>
                </View>
            </View>

            {song.lyrics && (
                <View style={styles.lyricsSection}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Lyrics
                    </Text>
                    <ScrollView
                        style={styles.lyricsScroll}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text
                            style={[styles.lyricsText, { color: theme.colors.onSurface }]}
                            selectable
                        >
                            {song.lyrics.lyrics}
                        </Text>
                    </ScrollView>
                </View>
            )}

            <FlatList
                data={related}
                renderItem={renderRelatedSection}
                keyExtractor={(item, index) => `section-${index}`}
                scrollEnabled={false}
                ListFooterComponent={<View style={styles.footer} />}
                removeClippedSubviews={true}
                initialNumToRender={3}
                maxToRenderPerBatch={5}
                windowSize={7}
            />
        </Animated.ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 24,
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
        padding: 24,
    },
    errorIcon: {
        marginBottom: 16,
    },
    errorText: {
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        borderRadius: 8,
        width: 150,
    },
    header: {
        flexDirection: "row",
        marginBottom: 24,
    },
    thumbnailContainer: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 16,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    // thumbnailGradient: {
    //     position: 'absolute',
    //     left: 0,
    //     right: 0,
    //     bottom: 0,
    //     height: '50%',
    // },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    songTitle: {
        fontWeight: "bold",
        marginBottom: 4,
        fontSize: 22,
    },
    artistName: {
        marginBottom: 4,
        opacity: 0.8,
    },
    albumName: {
        marginBottom: 12,
        opacity: 0.6,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    actionButton: {
        margin: 0,
    },
    lyricsSection: {
        marginBottom: 24,
    },
    lyricsScroll: {
        // maxHeight: 200,
    },
    lyricsText: {
        lineHeight: 24,
        fontSize: 16,
    },
    sectionTitle: {
        fontWeight: "bold",
        marginBottom: 12,
        fontSize: 18,
    },
    relatedSection: {
        marginBottom: 20,
    },
    relatedList: {
        paddingRight: 16,
    },
    relatedItem: {
        marginRight: 12,
        width: 150,
        borderRadius: 8,
        overflow: 'hidden',
    },
    relatedCard: {
        borderRadius: 8,
        overflow: "hidden",
        height: 200,
    },
    relatedImage: {
        width: "100%",
        height: 150,
    },
    relatedContent: {
        padding: 8,
        height: 50,
        justifyContent: "center",
    },
    relatedTitle: {
        fontWeight: "500",
    },
    relatedArtist: {
        opacity: 0.7,
        fontSize: 12,
    },
    modalContainer: {
        padding: 16,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontWeight: 'bold',
    },
    modalCloseButton: {
        margin: 0,
    },
    playlistItem: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    playlistContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playlistThumbnail: {
        width: 48,
        height: 48,
        borderRadius: 4,
        marginRight: 12,
    },
    playlistTextContainer: {
        flex: 1,
    },
    emptyPlaylists: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        marginTop: 8,
        textAlign: 'center',
    },
    modalButton: {
        marginTop: 16,
        borderRadius: 8,
    },
    modalButtonLabel: {
        fontWeight: '500',
    },
    footer: {
        height: 32,
    },
});

export default memo(SongDetailsPage);