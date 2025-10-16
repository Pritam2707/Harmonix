import React, { useEffect, useState, useCallback, memo, useMemo } from "react";
import {
    View,
    Image,
    TouchableOpacity,
    NativeModules,
    StyleSheet,
    FlatList,
    useWindowDimensions,
} from "react-native";
import {
    Text,
    Card,
    ActivityIndicator,
    useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import OfflinePage from "./Offline";
import { useOfflineStatus } from "../hooks/useOfflineStatus";

interface Video {
    title: string;
    videoId: string;
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
}

interface Category {
    params: string;
    title: string;
}

type PlaylistScreenNavigationProp = StackNavigationProp<RootStackParamList, "MoodPlaylists">;

const PlaylistCard = memo(({ playlist, onPress }: { playlist: any; onPress: (id: string) => void }) => {
    if (!playlist.playlistId) return null;
    const theme = useTheme();
    const lastThumbnail = playlist.thumbnails[playlist.thumbnails.length - 1];
    const aspectRatio = lastThumbnail ? lastThumbnail.width / lastThumbnail.height : 16 / 9;

    return (
        <TouchableOpacity
            onPress={() => onPress(playlist.playlistId)}
            style={styles.videoContainer}
        >
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Image
                    source={{ uri: lastThumbnail?.url }}
                    style={[styles.thumbnail, { aspectRatio }]}
                    resizeMode="cover"
                />
                <Card.Content style={styles.cardContent}>
                    <Text
                        numberOfLines={2}
                        style={[styles.videoTitle, { color: theme.colors.onSurface }]}
                        ellipsizeMode="tail"
                    >
                        {playlist.title}
                    </Text>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );
});

const MoodCard = memo(({ mood, onPress }: { mood: Category; onPress: (params: string) => void }) => {
    const theme = useTheme();
    return (
        <TouchableOpacity onPress={() => onPress(mood.params)}>
            <Card style={[styles.moodCard, { backgroundColor: theme.colors.elevation.level1 }]}>
                <Text style={[styles.moodText, { color: theme.colors.onSurface }]}>
                    {mood.title}
                </Text>
            </Card>
        </TouchableOpacity>
    );
});

const Discover = () => {
    const navigation = useNavigation<PlaylistScreenNavigationProp>();
    const [playlists, setPlaylists] = useState<any[]>([]);  
    const [moods, setMoods] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const { PythonModule } = NativeModules;
    const { isOffline } = useOfflineStatus();
    const { width } = useWindowDimensions();
    const [artists, setArtists] = useState<any[]>([]);
    // Calculate number of columns based on screen width
    const numColumns = useMemo(() => {
        if (width > 1200) return 4;   // Large tablets/desktop
        if (width > 800) return 3;    // Medium tablets
        return 2;                      // Phones (default)
    }, [width]);

    // Calculate item width based on number of columns
    const itemWidth = useMemo(() => {
        const horizontalPadding = 16 * 2; // Total padding from both sides
        const gap = 8 * (numColumns - 1); // Total gap between items
        return (width - horizontalPadding - gap) / numColumns;
    }, [width, numColumns]);

    const fetchData = useCallback(async () => {
        if (isOffline) return;
        
        try {
            setLoading(true);
            const [chartsResIndian, chartResGlobal, categoriesRes] = await Promise.all([
                PythonModule.getCharts("IN"),
                PythonModule.getCharts("ZZ"),
                PythonModule.getMoodCategories()
            ]);
            
            // Parse all responses at once to catch any JSON parsing errors
            const [chartsDataIndian, chartsDataGlobal, categoriesData] = [
                JSON.parse(chartsResIndian),
                JSON.parse(chartResGlobal),
                JSON.parse(categoriesRes)
            ];


            // Merge artists from both Indian and Global charts, removing duplicates
            const indianArtists = Array.isArray(chartsDataIndian?.artists) ? chartsDataIndian.artists : [];
            const globalArtists = Array.isArray(chartsDataGlobal?.artists) ? chartsDataGlobal.artists : [];
            
            // Use Map to keep only unique artists based on browseId
            const uniqueArtistsMap = new Map();
            [...indianArtists, ...globalArtists].forEach(artist => {
                if (artist?.browseId && !uniqueArtistsMap.has(artist.browseId)) {
                    uniqueArtistsMap.set(artist.browseId, artist);
                }
            });
            
            // Convert Map values back to array
            setArtists(Array.from(uniqueArtistsMap.values()));

            // Combine all playlists and remove duplicates
            setPlaylists(prev => {
                // Create array of all new playlists
                const newPlaylistsArray = [
                    ...(Array.isArray(chartsDataGlobal?.videos) ? chartsDataGlobal.videos : []),
                    ...(Array.isArray(chartsDataIndian?.daily) ? chartsDataIndian.daily : []),
                    ...(Array.isArray(chartsDataIndian?.weekly) ? chartsDataIndian.weekly : []),
                ];

                // Create a Map to store unique playlists
                const uniquePlaylistsMap = new Map();
                
                // Add existing playlists to the Map
                prev.forEach(playlist => {
                    if (playlist?.playlistId) {
                        uniquePlaylistsMap.set(playlist.playlistId, playlist);
                    }
                });

                // Add new playlists, overwriting any duplicates
                newPlaylistsArray.forEach(playlist => {
                    if (playlist?.playlistId) {
                        uniquePlaylistsMap.set(playlist.playlistId, playlist);
                    }
                });

                // Convert Map back to array
                return Array.from(uniquePlaylistsMap.values());
            });
            
            // Set moods if available
            if (categoriesData?.["Moods & moments"]) {
                setMoods(categoriesData["Moods & moments"]);
            }
            console.log(chartsDataIndian.artists)
        } catch (error) {
            console.error("Error fetching data:", error instanceof Error ? error.message : "Unknown error");
            setArtists([]);
            setPlaylists([]);
            setMoods([]);
        } finally {
            setLoading(false);
        }
    }, [isOffline]);

    useEffect(() => {
        if (!isOffline) {
            fetchData();
        }
    }, [fetchData, isOffline]);

    const handleMoodPress = useCallback((params: string) => {
        navigation.navigate("MoodPlaylists", { mood: params });
    }, [navigation]);

    const handlePlaylistPress = useCallback((playlistId: string) => {
        navigation.navigate("Playlist", { playlistId: playlistId });
    }, [navigation]);
const handleArtistPress = useCallback((artistId: string) => {
        navigation.navigate("Artist", { artistId: artistId });
    }, [navigation]);
  

    if (isOffline) {
        return <OfflinePage />;
    }

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <Text variant="headlineMedium" style={styles.title}>Discover Music</Text>

            <Text variant="titleLarge" style={styles.sectionTitle}>Moods & Moments</Text>
            <FlatList
                horizontal
                data={moods}
                keyExtractor={(item) => item.params}
                renderItem={({ item }) => (
                    <MoodCard key={item.params} mood={item} onPress={handleMoodPress} />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodsContainer}
                initialNumToRender={5}
                windowSize={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews={true}
            />




            {artists.length > 0 && (
                <>
                    <Text variant="titleLarge" style={styles.sectionTitle}>Trending Artists</Text>
                    <FlatList
                        horizontal
                        data={artists}
                        keyExtractor={(item) => item.browseId}
                        renderItem={({ item }) => (
                            <Card style={[styles.artistCard, { backgroundColor: theme.colors.elevation.level1 }]}
                        onPress={()=>handleArtistPress(item.browseId)}
                        >
                                <Image
                                    source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }}
                                    style={styles.artistThumbnail}
                                    resizeMode="cover"
                                />
                                <Card.Content>
                                    <Text numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                                        {item.title}
                                    </Text>
                                </Card.Content>
                            </Card>
                        )}
                        
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingVertical: 6 }}
                        initialNumToRender={5}
                        windowSize={5}
                        maxToRenderPerBatch={5}
                        removeClippedSubviews={true}
                    />
                </>
            )}
            <Text variant="titleLarge" style={styles.sectionTitle}>Trending</Text>

        </View>
    );


    return (
        <FlatList
            data={playlists}
            keyExtractor={(item) => item.playlistId}
            numColumns={numColumns}
            renderItem={({ item }) => (
                <View style={{ width: itemWidth }}>
                    <PlaylistCard
                        playlist={item}
                        onPress={handlePlaylistPress}
                    />
                </View>
            )}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={[
                styles.contentContainer,
                {
                    backgroundColor: theme.colors.background,
                    paddingBottom: 48,
                    paddingHorizontal: 16,
                }
            ]}
            columnWrapperStyle={numColumns > 1 ? styles.flatListRow : undefined}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            getItemLayout={(data, index) => ({
                length: itemWidth,
                offset: itemWidth * index,
                index,
            })}
        />
    );
};

const styles = StyleSheet.create({
    artistCard: {
        width: 150,
        marginRight: 12,
        borderRadius: 10,
        overflow: "hidden",
        alignItems: "center",
    },
    artistThumbnail: {
        width: 150,
        height: 150,
        borderRadius: 5,
    },

    contentContainer: {
        paddingBottom: 48,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontWeight: "bold",
        marginBottom: 16,
    },
    sectionTitle: {
        fontWeight: "bold",
        marginTop: 24,
        marginBottom: 12,
    },
    moodsContainer: {
        paddingVertical: 6,
        paddingRight: 8,
    },
    flatListRow: {
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 18,
    },
    moodCard: {
        marginRight: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        minWidth: 100,
        alignItems: "center",
        borderRadius: 10,
        elevation: 2,
    },
    moodText: {
        fontSize: 14,
        fontWeight: "600",
    },
    videoContainer: {
        marginBottom: 18,
    },
    card: {
        borderRadius: 10,
        overflow: "hidden",
    },
    thumbnail: {
        width: "100%",
        height: undefined,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    cardContent: {
        padding: 10,
    },
    videoTitle: {
        fontSize: 14,
        fontWeight: "500",
    },
});

export default Discover;