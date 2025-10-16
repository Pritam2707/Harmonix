import React, { useEffect, useState, useCallback, memo, useRef } from "react";
import {
    View,
    Image,
    FlatList,
    Dimensions,
    NativeModules,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Alert
} from "react-native";
import {
    Text,
    Card,
    ActivityIndicator,
    useTheme,
    IconButton,
    TouchableRipple,
    Button
} from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Playlist {
    id: string | null;
    title: string;
    author?:{
        name:string;
        id:string;
    }
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
    owned: boolean;
}

const { width: screenWidth } = Dimensions.get("window");
const CARD_MARGIN = 8;
const CARD_WIDTH = (screenWidth - CARD_MARGIN * 4) / 2;

const MemoTrackCard = memo(({ item, onPress, theme, onRemove, showRemove }: {
    item: any,
    onPress: any,
    theme: any,
    onRemove?: () => void,
    showRemove?: boolean
}) => {
    const imageUrl = item.thumbnails?.[item.thumbnails.length - 1]?.url ?? "https://placehold.co/200";
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
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
                onPress={() => onPress(item.videoId)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                borderless
                rippleColor={theme.colors.primaryContainer}
                style={styles.trackRipple}
            >
                <Card style={[
                    styles.trackCard,
                    {
                        backgroundColor: theme.colors.surface,
                        shadowColor: theme.colors.onSurface,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                    }
                ]}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.trackImage}
                            resizeMode="cover"
                        />

                    </View>
                    <Card.Content style={styles.trackContent}>
                        <Text
                            variant="titleMedium"
                            numberOfLines={1}
                            style={{ color: theme.colors.onSurface }}
                        >
                            {item.title}
                        </Text>
                        {item.artists && (
                            <Text
                                variant="bodySmall"
                                numberOfLines={1}
                                style={{ color: theme.colors.onSurfaceVariant }}
                            >
                                {item.artists.map((a: any) => a.name).join(", ")}
                            </Text>
                        )}
                        {item.duration && (
                            <View style={styles.durationContainer}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={14}
                                    color={theme.colors.onSurfaceVariant}
                                />
                                <Text
                                    variant="labelSmall"
                                    style={{
                                        color: theme.colors.onSurfaceVariant,
                                        marginLeft: 4
                                    }}
                                >
                                    {item.duration}
                                </Text>
                            </View>
                        )}
                    </Card.Content>
                    {showRemove && (
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={onRemove}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="close-circle"
                                size={24}
                                color={theme.colors.error}
                            />
                        </TouchableOpacity>
                    )}
                </Card>
            </TouchableRipple>
        </Animated.View>
    );
});

const PlaylistScreen = () => {
    const route = useRoute();
    const theme = useTheme();
    const { playlistId } = route.params as { playlistId: string };
    const { PythonModule } = NativeModules;
    const { playSong, playPlaylist } = useMusicPlayer();

    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const fetchPlaylist = useCallback(async () => {
        setLoading(true);
        try {
            const res = await PythonModule.getPlaylist(playlistId);
            const data = JSON.parse(res);
            setPlaylist(data);
            console.log(data)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } catch (error) {
            console.error("Failed to fetch playlist:", error);
        } finally {
            setLoading(false);
        }
    }, [playlistId]);

    const handleRemoveTrack = useCallback(async (videoId: string, setVideoId: string) => {
        if (!playlist?.owned) return;

        Alert.alert(
            "Remove Song",
            "Are you sure you want to remove this song from the playlist?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await PythonModule.removePlaylistItems(playlistId, videoId, setVideoId);
                            // Optimistically update UI
                            setPlaylist(prev => prev ? {
                                ...prev,
                                tracks: prev.tracks.filter(track => track.videoId !== videoId)
                            } : null);
                        } catch (error) {
                            console.error("Failed to remove track:", error);
                            Alert.alert("Error", "Could not remove the song");
                        }
                    }
                }
            ]
        );
    }, [playlistId, playlist?.owned]);

    const handlePlaySong = useCallback(
        (videoId: string) => {
            if (videoId) playSong(videoId, {});
        },
        [playSong]
    );

    useEffect(() => {
        fetchPlaylist();
    }, [fetchPlaylist]);

    const keyExtractor = useCallback((item: any) => item.videoId, []);

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <MemoTrackCard
                item={item}
                onPress={handlePlaySong}
                theme={theme}
                onRemove={() => handleRemoveTrack(item.videoId, item.setVideoId)}
                showRemove={playlist?.owned}
            />
        ),
        [handlePlaySong, theme, handleRemoveTrack, playlist?.owned]
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                />
            </View>
        );
    }

    if (!playlist) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <MaterialCommunityIcons
                    name="playlist-remove"
                    size={48}
                    color={theme.colors.error}
                    style={styles.errorIcon}
                />
                <Text
                    variant="titleLarge"
                    style={[styles.errorText, { color: theme.colors.onSurface }]}
                >
                    Playlist not found
                </Text>
                <Button
                    mode="contained"
                    onPress={fetchPlaylist}
                    style={styles.retryButton}
                >
                    Try Again
                </Button>
            </View>
        );
    }

    return (
        <Animated.FlatList
            data={playlist.tracks}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={[
                styles.listContent,
                { backgroundColor: theme.colors.background }
            ]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            style={{ opacity: fadeAnim }}
            ListHeaderComponent={
                <Card style={[
                    styles.headerCard,
                    {
                        backgroundColor: theme.colors.surface,
                        shadowColor: theme.colors.onSurface,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                    }
                ]}>
                    <View style={styles.headerContent}>
                        <Image
                            source={{
                                uri: playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url ?? "https://placehold.co/200"
                            }}
                            style={styles.playlistImage}
                        />
                        <View style={styles.headerText}>
                            <Text
                                variant="headlineSmall"
                                numberOfLines={2}
                                style={[
                                    styles.playlistTitle,
                                    { color: theme.colors.onSurface }
                                ]}
                            >
                                {playlist.title || "Untitled Playlist"}
                            </Text>
                            {playlist.author && (
                                <Text
                                    variant="bodyMedium"
                                    style={{ color: theme.colors.onSurfaceVariant }}
                                >
                                    By {playlist.author.name}
                                </Text>
                            )}
                            {playlist.description && (
                                <Text
                                    variant="bodySmall"
                                    style={[
                                        styles.playlistDescription,
                                        { color: theme.colors.onSurfaceVariant }
                                    ]}
                                >
                                    {playlist.description}
                                </Text>
                            )}
                            <View style={styles.trackCountContainer}>
                                <MaterialCommunityIcons
                                    name="music"
                                    size={16}
                                    color={theme.colors.onSurfaceVariant}
                                />
                                <Text
                                    variant="labelMedium"
                                    style={{
                                        color: theme.colors.onSurfaceVariant,
                                        marginLeft: 4
                                    }}
                                >
                                    {playlist.tracks.length} tracks
                                </Text>
                                {playlist.owned && (
                                    <Text
                                        variant="labelSmall"
                                        style={[
                                            styles.ownedBadge,
                                            {
                                                backgroundColor: theme.colors.primaryContainer,
                                                color: theme.colors.onPrimaryContainer
                                            }
                                        ]}
                                    >
                                        Your Playlist
                                    </Text>
                                )}



                            </View>
                            <Button
                                // variant="labelSmall"
                                style={[
                                    // styles.ownedBadge,
                                    {
                                        marginTop: 12,
                                        backgroundColor: theme.colors.primary,
                                        // paddingVertical: 10,
                                        // paddingHorizontal: 10,
                                        borderRadius: 20,
                                    }
                                ]}
                                onPress={() => playPlaylist(playlist.tracks, playlist.id || playlist.title)}
                            >
                                <Text
                                    // variant="labelSmall"
                                    style={[
                                        // styles.ownedBadge,
                                        {
                                            textAlign: "center",

                                        }
                                    ]}
                                >
                                    Play
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Card>
            }
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                        name="music-box-multiple-outline"
                        size={64}
                        color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                        variant="titleMedium"
                        style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
                    >
                        No tracks in this playlist
                    </Text>
                </View>
            }
            renderItem={renderItem}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    listContent: {
        minHeight: "100%",
        padding: CARD_MARGIN,
        paddingBottom: 80
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: CARD_MARGIN
    },
    headerCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        elevation: 2
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "flex-start"
    },
    playlistImage: {
        width: 120,
        height: 120,
        borderRadius: 8,
        marginRight: 16
    },
    headerText: {
        flex: 1
    },
    playlistTitle: {
        fontWeight: "bold",
        marginBottom: 4
    },
    playlistDescription: {
        marginTop: 8
    },
    trackCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8
    },
    ownedBadge: {
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
        fontSize: 12,
        overflow: 'hidden'
    },
    trackRipple: {
        borderRadius: 8,
        margin: CARD_MARGIN / 2,
    },
    trackCard: {
        width: CARD_WIDTH,
        borderRadius: 8,
        overflow: "hidden",
    },
    imageContainer: {
        width: "100%",
        aspectRatio: 1
    },

    trackImage: {
        width: "100%",
        height: "100%"
    },
    trackContent: {
        padding: 12
    },
    durationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 2
    },
    errorIcon: {
        marginBottom: 16
    },
    errorText: {
        marginBottom: 16,
        textAlign: 'center'
    },
    retryButton: {
        borderRadius: 8,
        width: 150
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    emptyText: {
        marginTop: 16,
        textAlign: 'center'
    }
});

export default memo(PlaylistScreen);