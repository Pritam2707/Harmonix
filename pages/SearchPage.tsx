import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    FlatList,
    useWindowDimensions,
} from "react-native";
import { useTheme, Card } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import { useMusic } from "../hooks/useMusic";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

const CARD_GAP = 12;
const DEBOUNCE_DELAY = 400;

type ScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const SearchScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<ScreenNavigationProp>();
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const { searchMusic, searchResults } = useMusic();
    const { playSong } = useMusicPlayer();
    const { param } = route.params as { param: string };

    const numColumns = 2;
    const CARD_WIDTH = useMemo(() => (width - (numColumns + 1) * CARD_GAP - 32) / numColumns, [width]);

    const [query, setQuery] = useState(param || "");
    const [loading, setLoading] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setLoading(true);
        await searchMusic(query);
        setLoading(false);
    }, [query, searchMusic]);

    // Debounce effect
    useEffect(() => {
        const timeout = setTimeout(() => {
            handleSearch();
        }, DEBOUNCE_DELAY);
        return () => clearTimeout(timeout);
    }, [query]);

    const handlePlaySong = useCallback(
        async (item: any) => {
            const { videoId, resultType, browseId, playlistId, artists } = item;

            if (videoId) return playSong(videoId, {});
            if (resultType === "artist") {
                navigation.navigate("Artist", { artistId: browseId || artists?.[0]?.id });
            } else if (resultType === "playlist") {
                navigation.navigate("Playlist", { playlistId: playlistId || browseId });
            } else if (resultType === "album") {
                navigation.navigate("Album", { albumId: browseId });
            }
        },
        [navigation, playSong]
    );
    const handleLongPress = useCallback(
        async (item: any) => {
            const { videoId, resultType, browseId, playlistId, artists } = item;

            if (videoId) return navigation.navigate("SongDetails", { videoId: videoId });
            if (resultType === "artist") {
                navigation.navigate("Artist", { artistId: browseId || artists?.[0]?.id });
            } else if (resultType === "playlist") {
                navigation.navigate("Playlist", { playlistId: playlistId || browseId });
            } else if (resultType === "album") {
                navigation.navigate("Album", { albumId: browseId });
            }
        },
        [navigation, playSong]
    );
 const groupedData = useMemo(() => {
    if (!Array.isArray(searchResults)) return [];

    // Map resultType to display categories
    const typeToCategory = {
        song: "Songs",
        video: "Songs",          // Videos grouped under Songs
        album: "Albums",
        playlist: "Community Playlists",
        artist: "Artists",
    };

    // Define the display order
    const categories = ["Top result", "Songs", "Albums", "Community Playlists", "Artists"];
    const groups = [];

    for (const category of categories) {
        let items = searchResults.filter((item) => {
            if (category === "Top result") {
                // Optional: include any item marked as top, or fallback to first few items
                return item.resultType; // could include all for Top result or customize
            }
            return typeToCategory[item.resultType] === category;
        });

        // Sort videos before songs in the "Songs" category
        if (category === "Songs") {
            items.sort((a, b) => (a.resultType === "video" ? -1 : 1));
        }

        if (items.length) {
            groups.push({ title: category, data: items });
        }
    }

    return groups;
}, [searchResults]);

    const MemoCard = useMemo(() => React.memo(({ item }: { item: any }) => {
        const title = item.resultType === "artist" ? item?.artist : item?.title?.trim() || "Unknown Title";
        const artistNames = item?.artists?.map((a: any) => a?.name).join(", ") || "";
        const duration = item?.duration || "";
        const thumbnail = item.thumbnails?.[item.thumbnails.length - 1]?.url || "";

        return (
            <TouchableOpacity
                onLongPress={() => {
                    handleLongPress(item);
                }}
                onPress={() => handlePlaySong(item)}
                style={{
                    width: CARD_WIDTH,
                    marginBottom: 16,
                    marginRight: CARD_GAP,
                    flex: 1,
                }}
            >
                <Card style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden", width: CARD_WIDTH }}>
                    <Image
                        source={{ uri: thumbnail }}
                        style={{ aspectRatio: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                        resizeMode="cover"
                    />
                    <View style={{ padding: 8 }}>
                        <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>{title}</Text>
                        {artistNames ? (
                            <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>
                                {artistNames}
                            </Text>
                        ) : null}
                        {duration ? (
                            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>{duration}</Text>
                        ) : null}
                    </View>
                </Card>
            </TouchableOpacity>
        );
    }), [CARD_WIDTH, colors]);

    const renderGroup = useCallback(({ item }: any) => (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.onBackground, marginBottom: 12 }}>
                {item.title}
            </Text>
            <FlatList
                data={item.data}
                renderItem={({ item }) => <MemoCard item={item} />}
                keyExtractor={(i, index) => i.videoId ?? `${item.title}-${index}`}
                numColumns={numColumns}
                scrollEnabled={false}
                columnWrapperStyle={{
                    justifyContent: "space-between",
                    marginBottom: 12,
                }}
                removeClippedSubviews
                initialNumToRender={6}
                maxToRenderPerBatch={10}
            />
        </View>
    ), [MemoCard, numColumns]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }}>
            {/* Search Bar */}
            <View style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 16,
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 12,
                elevation: 2,
            }}>
                <TextInput
                    style={{ flex: 1, color: colors.onSurface, fontSize: 16, paddingVertical: 8 }}
                    placeholder="Search songs, albums, or artists..."
                    placeholderTextColor={colors.onSurfaceDisabled}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                />
                <TouchableOpacity onPress={handleSearch}>
                    <Icon name="search-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Results */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : groupedData.length ? (
                <FlatList
                    data={groupedData}
                    renderItem={renderGroup}
                    keyExtractor={(item) => item.title}
                    initialNumToRender={3}
                    removeClippedSubviews
                    windowSize={5}
                />
            ) : (
                <Text style={{ color: colors.onBackground, textAlign: "center", marginTop: 20 }}>
                    No results found.
                </Text>
            )}
        </View>
    );
};

export default SearchScreen;
