import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    FlatList,
    useWindowDimensions
} from "react-native";
import { useTheme, Card } from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import { useMusic } from "../hooks/useMusic";
import { useMusicPlayer } from "../hooks/useMusicPlayer";

const SearchScreen = () => {
    const { colors } = useTheme();
    const { searchMusic, searchResults } = useMusic();
    const { playSong } = useMusicPlayer();
    const { width } = useWindowDimensions();

    // Set numColumns to 2 regardless of orientation, then calculate dynamic width
    const numColumns = 2;
    const CARD_GAP = 12;
    const CARD_WIDTH = (width - (numColumns + 1) * CARD_GAP - 32) / numColumns; // 32 for screen padding

    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce the search to prevent immediate API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);

        return () => clearTimeout(timer); // Cleanup timeout if query changes before 500ms
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.trim()) {
            handleSearch();
        }
    }, [debouncedQuery]);

    const handleSearch = useCallback(() => {
        if (!debouncedQuery.trim()) return;
        setLoading(true);
        searchMusic(debouncedQuery).finally(() => setLoading(false));
    }, [debouncedQuery]);

    const handlePlaySong = useCallback(
        async (song: any) => {
            if ((song.resultType === "song" || song.resultType === "video") && song.videoId) {
                await playSong(song.videoId);
            }
        },
        [playSong]
    );

    const groupedData = useCallback(() => {
        if (!Array.isArray(searchResults)) return [];

        const categories = ["Songs", "Videos", "Albums", "Community Playlists", "Artists"];
        const resultsByCategory = [];

        for (const category of categories) {
            const items = searchResults.filter((item) => item.category === category);
            if (items.length) {
                resultsByCategory.push({ title: category, data: items });
            }
        }

        return resultsByCategory;
    }, [searchResults]);

    const renderItem = ({ item }: { item: any }) => {
        const title = item?.title?.trim() || "Unknown Title";
        const artistNames = item?.artists?.map((a: any) => a?.name).join(", ") || "";
        const duration = item?.duration || "";
        const thumbnail = item.thumbnails?.[item.thumbnails.length - 1]?.url || "";

        return (
            <TouchableOpacity
                onPress={() => handlePlaySong(item)}
                style={{
                    width: CARD_WIDTH,
                    marginBottom: 16,
                    marginRight: CARD_GAP,
                    flex: 1, // Ensure each card uses available space equally
                }}
            >
                <Card style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: "hidden" }}>
                    <Image
                        source={{ uri: thumbnail }}
                        style={{
                            width: "100%",
                            aspectRatio: 1,
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                        }}
                        resizeMode="cover"
                    />
                    <View style={{ padding: 8 }}>
                        <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>
                            {title}
                        </Text>
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
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16 }}>
            {/* Search Bar */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginVertical: 16,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    elevation: 2,
                }}
            >
                <TextInput
                    style={{
                        flex: 1,
                        color: colors.onSurface,
                        fontSize: 16,
                        paddingVertical: 8,
                    }}
                    placeholder="Search songs, albums, or artists..."
                    placeholderTextColor={colors.onSurfaceDisabled}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                <TouchableOpacity onPress={handleSearch}>
                    <Icon name="search-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Loading */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : groupedData().length ? (
                <FlatList
                    data={groupedData()}
                    keyExtractor={(item) => item.title}
                    renderItem={({ item }) => (
                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.onBackground, marginBottom: 12 }}>
                                {item.title}
                            </Text>
                            <FlatList
                                data={item.data}
                                renderItem={renderItem}
                                keyExtractor={(i, index) => i.videoId ?? `${item.title}-${index}`}
                                numColumns={numColumns}
                                scrollEnabled={false}
                                columnWrapperStyle={{
                                    justifyContent: "space-between",
                                    marginBottom: 12,
                                }}
                            />
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={{ color: colors.onBackground, textAlign: "center", marginTop: 20 }}>
                            No results found.
                        </Text>
                    }
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
