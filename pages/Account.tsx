import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    StyleSheet,
    Platform,
    UIManager,
    LayoutAnimation,
    FlatList,
    RefreshControl,
    Modal,
    TouchableWithoutFeedback,
    useWindowDimensions,
    NativeModules,
} from "react-native";
import {
    useTheme,
    Avatar,
    Button,
    Card,
    Text,
    ActivityIndicator,
    Chip,
    Badge,
    Portal,
    TouchableRipple,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeToggle } from "../themes";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, "History">;

if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Song {
    artists: { name: string; id: string }[];
    title: string;
    videoId: string;
    thumbnails: { url: string }[];
}

interface LikedSong {
    tracks: Song[];
}

interface CachedData {
    account: {
        name: string;
        email: string;
        avatarUrl: string;
    };
    likedSongs: LikedSong | null;
    librarySongs: Song[];
    timestamp: number;
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours cache

const AccountPage = () => {
    const theme = useTheme();
    const navigation = useNavigation<HistoryScreenNavigationProp>();
    const { setTheme } = useThemeToggle();
    const { playSong } = useMusicPlayer();
    const { isOffline } = useOfflineStatus();
    const { width } = useWindowDimensions();

    // State
    const [account, setAccount] = useState({ name: "", email: "", avatarUrl: "" });
    const [loading, setLoading] = useState(true);
    const [themeModalVisible, setThemeModalVisible] = useState(false);
    const [likedSongs, setLikedSongs] = useState<LikedSong | null>(null);
    const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState({
        liked: 10,
        library: 10
    });

    // Constants
    const themeOptions = ["dark", "light", "peach", "orange", "cyber", "purple", "green", "blue"];
    const CACHE_KEY = "accountData";
    const AVATAR_SIZE = 90;
    const CARD_WIDTH = useMemo(() => Math.min(width * 0.4, 180), [width]);
    const isMounted = React.useRef(true);

    // Load cached data
    const loadCachedData = useCallback(async () => {
        try {
            const cachedData = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsedData: CachedData = JSON.parse(cachedData);
                if (Date.now() - parsedData.timestamp < CACHE_EXPIRY) {
                    setAccount(parsedData.account);
                    setLikedSongs(parsedData.likedSongs);
                    setLibrarySongs(parsedData.librarySongs);
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.warn("Failed to load cached data:", error);
            return false;
        }
    }, []);

    // Save data to cache
    const saveToCache = useCallback(async (data: Omit<CachedData, "timestamp">) => {
        try {
            const cacheData: CachedData = {
                ...data,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.warn("Failed to save data to cache:", error);
        }
    }, []);

    const fetchAccountInfo = useCallback(async () => {
        try {
            const res = await NativeModules.PythonModule.getAccountInfo();
            const data = JSON.parse(res);
            const accountData = {
                name: data.accountName || "User",
                email: data.channelHandle || "",
                avatarUrl: data.accountPhotoUrl || "",
            };
            setAccount(accountData);
            return accountData;
        } catch (err) {
            console.error("Failed to fetch account info:", err);
            throw err;
        }
    }, []);

    const fetchSongs = useCallback(async () => {
        if (isOffline) {
            setFetchError("You're offline. Using cached data.");
            return;
        }

        setRefreshing(true);
        try {
            const [likedRes, libraryRes] = await Promise.all([
                NativeModules.PythonModule.getLikedSong(50),
                NativeModules.PythonModule.getLibrarySongs(50)
            ]);

            const likedData = JSON.parse(likedRes);
            const libraryData = JSON.parse(libraryRes);

            if (isMounted.current) {
                setLikedSongs(likedData);
                setLibrarySongs(libraryData);
                setFetchError(null);
            }

            return { likedSongs: likedData, librarySongs: libraryData };
        } catch (err) {
            console.error("Failed to fetch songs:", err);
            if (isMounted.current) {
                setFetchError("Failed to load content. Pull to refresh.");
            }
            throw err;
        } finally {
            if (isMounted.current) {
                setRefreshing(false);
            }
        }
    }, [isOffline]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const hasCache = await loadCachedData();

            if (!hasCache || !isOffline) {
                const [accountData, songsData] = await Promise.all([
                    fetchAccountInfo(),
                    fetchSongs()
                ]);

                if (accountData && songsData) {
                    await saveToCache({
                        account: accountData,
                        likedSongs: songsData.likedSongs,
                        librarySongs: songsData.librarySongs
                    });
                }
            }
        } catch (error) {
            console.error("Initial data load failed:", error);
        } finally {
            if (isMounted.current) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setLoading(false);
            }
        }
    }, [fetchAccountInfo, fetchSongs, isOffline, loadCachedData, saveToCache]);

    useEffect(() => {
        isMounted.current = true;
        loadData();

        return () => {
            isMounted.current = false;
        };
    }, [loadData]);

    const handleRefresh = useCallback(async () => {
        try {
            const [accountData, songsData] = await Promise.all([
                fetchAccountInfo(),
                fetchSongs()
            ]);

            if (accountData && songsData) {
                await saveToCache({
                    account: accountData,
                    likedSongs: songsData.likedSongs,
                    librarySongs: songsData.librarySongs
                });
            }
        } catch (error) {
            console.error("Refresh failed:", error);
        }
    }, [fetchAccountInfo, fetchSongs, saveToCache]);

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            console.log("Logged out successfully");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const loadMore = (type: 'liked' | 'library') => {
        setVisibleCount(prev => ({
            ...prev,
            [type]: prev[type] + 10
        }));
    };

    const renderSongCard = useCallback(
        ({ item }: { item: Song }) => (
            <Card
                style={[styles.songCard, {
                    width: CARD_WIDTH,
                    backgroundColor: theme.colors.surface,
                    elevation: 3
                }]}
                onPress={() => playSong(item.videoId, {})}
            >
                <Card.Cover
                    source={{ uri: item.thumbnails[item.thumbnails?.length - 1]?.url }}
                    style={styles.cardImage}
                    theme={{ roundness: 8 }}
                />
                <Card.Content style={styles.cardContent}>
                    <Text
                        variant="bodyMedium"
                        numberOfLines={1}
                        style={{
                            color: theme.colors.onSurface,
                            fontWeight: '500'
                        }}
                    >
                        {item.title}
                    </Text>
                    <Text
                        variant="bodySmall"
                        numberOfLines={1}
                        style={{
                            color: theme.colors.onSurfaceVariant,
                            marginTop: 4
                        }}
                    >
                        {item.artists.map((artist, i) => (
                            <Text
                                key={artist.id || i}
                                onPress={() => artist.id && navigation.navigate("Artist", { artistId: artist.id })}
                                style={[
                                    styles.artistText,
                                    artist.id && {
                                        textDecorationLine: "underline",
                                        color: theme.colors.primary
                                    },
                                ]}
                            >
                                {artist.name}
                                {i < item.artists?.length - 1 ? ", " : ""}
                            </Text>
                        ))}
                    </Text>
                </Card.Content>
            </Card>
        ),
        [CARD_WIDTH, theme, playSong, navigation]
    );

    const renderThemeOption = useCallback(({ item }: { item: string }) => (
        <TouchableRipple
            onPress={() => {
                setTheme(item as any);
                setThemeModalVisible(false);
            }}
            style={[
                styles.themeOption,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                }
            ]}
        >
            <Text style={{ color: theme.colors.onSurface }}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
        </TouchableRipple>
    ), [theme, setTheme]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            padding: 16,
        },
        profileCard: {
            marginBottom: 24,
            borderRadius: 16,
            padding: 20,
            backgroundColor: theme.colors.elevation.level1,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
        },
        avatarContainer: {
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
        },
        offlineBadge: {
            position: 'absolute',
            bottom: -5,
            right: -5,
        },
        name: {
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
            color: theme.colors.onSurface,
            marginTop: 8
        },
        email: {
            fontSize: 16,
            textAlign: "center",
            color: theme.colors.onSurfaceVariant,
            marginBottom: 12
        },
        buttonGroup: {
            flexDirection: "row",
            justifyContent: "center",
            flexWrap: 'wrap',
            marginTop: 16,
            gap: 8,
        },
        chip: {
            marginHorizontal: 4,
        },
        sectionHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginVertical: 16,
        },
        loadMoreButton: {
            alignSelf: "center",
            marginVertical: 16,
        },
        errorChip: {
            alignSelf: 'center',
            marginVertical: 12,
            backgroundColor: theme.colors.errorContainer
        },
        songCard: {
            marginRight: 12,
            borderRadius: 12,
        },
        cardImage: {
            height: CARD_WIDTH,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
        },
        cardContent: {
            padding: 12,
        },
        listContent: {
            paddingBottom: 8,
        },
        artistText: {
            fontSize: 14,
        },
        modalContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
        },
        modalContent: {
            width: '80%',
            maxHeight: '60%',
            backgroundColor: theme.colors.background,
            borderRadius: 16,
            padding: 20,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            color: theme.colors.onBackground,
            textAlign: 'center',
        },
        themeOption: {
            padding: 16,
            marginVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
        },
    }), [theme, CARD_WIDTH]);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <FlatList
                data={[]}
                renderItem={() => null}
                ListHeaderComponent={
                    <View style={styles.container}>
                        {/* Profile Card */}
                        <Card style={styles.profileCard}>
                            <View style={styles.avatarContainer}>
                                {loading ? (
                                    <ActivityIndicator size="large" color={theme.colors.primary} />
                                ) : (
                                    <View>
                                        <Avatar.Image
                                            size={AVATAR_SIZE}
                                            source={{ uri: account.avatarUrl }}
                                            theme={{ colors: { primary: theme.colors.primary } }}
                                        />
                                        {isOffline && (
                                            <Badge
                                                size={24}
                                                style={[
                                                    styles.offlineBadge,
                                                    { backgroundColor: theme.colors.error }
                                                ]}
                                            >
                                                Offline
                                            </Badge>
                                        )}
                                    </View>
                                )}
                            </View>

                            <Text style={styles.name}>
                                {loading ? "Loading..." : account.name}
                            </Text>

                            {account.email && (
                                <Text style={styles.email}>
                                    {account.email}
                                </Text>
                            )}

                            <View style={styles.buttonGroup}>
                                <Chip
                                    icon="logout"
                                    mode="outlined"
                                    onPress={handleLogout}
                                    style={styles.chip}
                                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                                >
                                    Logout
                                </Chip>

                                <Chip
                                    icon="history"
                                    mode="outlined"
                                    onPress={() => navigation.push("History")}
                                    style={styles.chip}
                                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                                >
                                    History
                                </Chip>

                                <Chip
                                    icon="download"
                                    mode="outlined"
                                    onPress={() => navigation.push("Offline")}
                                    style={styles.chip}
                                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                                >
                                    Downloads
                                </Chip>

                                <Chip
                                    icon="palette"
                                    mode="outlined"
                                    onPress={() => setThemeModalVisible(true)}
                                    style={styles.chip}
                                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                                >
                                    Theme
                                </Chip>
                            </View>
                        </Card>

                        {/* Error Message */}
                        {fetchError && (
                            <Chip
                                icon="alert-circle"
                                style={styles.errorChip}
                                textStyle={{ color: theme.colors.onErrorContainer }}
                            >
                                {fetchError}
                            </Chip>
                        )}

                        {/* Liked Songs Section */}
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                                Liked Songs
                            </Text>
                            <Button
                                icon="refresh"
                                onPress={handleRefresh}
                                compact
                                mode="text"
                                textColor={theme.colors.primary}
                                disabled={refreshing}
                            >
                                Refresh
                            </Button>
                        </View>

                        {likedSongs ? (
                            <>
                                <FlatList
                                    horizontal
                                    data={likedSongs.tracks?.slice(0, visibleCount.liked)}
                                    renderItem={renderSongCard}
                                    keyExtractor={(item, index) => `liked-${item.videoId}-${index}`}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.listContent}
                                    initialNumToRender={5}
                                    maxToRenderPerBatch={10}
                                    windowSize={10}
                                />
                                {visibleCount.liked < likedSongs.tracks?.length && (
                                    <Button
                                        mode="text"
                                        onPress={() => loadMore('liked')}
                                        style={styles.loadMoreButton}
                                        textColor={theme.colors.primary}
                                        icon="chevron-right"
                                    >
                                        Show More
                                    </Button>
                                )}
                            </>
                        ) : (
                            <ActivityIndicator animating={!refreshing} color={theme.colors.primary} />
                        )}

                        {/* Library Songs Section */}
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                                Your Library
                            </Text>
                            <Button
                                icon="refresh"
                                onPress={handleRefresh}
                                compact
                                mode="text"
                                textColor={theme.colors.primary}
                                disabled={refreshing}
                            >
                                Refresh
                            </Button>
                        </View>

                        {librarySongs ? (
                            <>
                                <FlatList
                                    horizontal
                                    data={librarySongs?.slice(0, visibleCount.library)}
                                    renderItem={renderSongCard}
                                    keyExtractor={(item, index) => `library-${item.videoId}-${index}`}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.listContent}
                                    initialNumToRender={5}
                                    maxToRenderPerBatch={10}
                                    windowSize={10}
                                />
                                {visibleCount.library < librarySongs?.length && (
                                    <Button
                                        mode="text"
                                        onPress={() => loadMore('library')}
                                        style={styles.loadMoreButton}
                                        textColor={theme.colors.primary}
                                        icon="chevron-right"
                                    >
                                        Show More
                                    </Button>
                                )}
                            </>
                        ) : (
                            <ActivityIndicator animating={!refreshing} color={theme.colors.primary} />
                        )}
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[theme.colors.primary]}
                        progressBackgroundColor={theme.colors.surface}
                    />
                }
                ListFooterComponent={<View style={{ height: 32 }} />}
            />

            {/* Theme Picker Modal */}
            <Portal>
                <Modal
                    visible={themeModalVisible}
                    onDismiss={() => setThemeModalVisible(false)}
                    transparent
                    animationType="fade"
                >
                    <TouchableWithoutFeedback onPress={() => setThemeModalVisible(false)}>
                        <View style={styles.modalContainer}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Select Theme</Text>
                                    <FlatList
                                        data={themeOptions}
                                        renderItem={renderThemeOption}
                                        keyExtractor={(item) => item}
                                        showsVerticalScrollIndicator={false}
                                    />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </Portal>
        </View>
    );
};

export default React.memo(AccountPage);