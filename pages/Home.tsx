import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useMusic } from "../hooks/useMusic";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { useNavigation } from "@react-navigation/native";
import {
    useTheme,
    Card,
    ActivityIndicator,
    TextInput,
} from "react-native-paper";
import { getCategory } from "../hooks/getCategory";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import OfflinePage from "./Offline";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Album">;

const HomeScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { homeData, loading, error, getHome } = useMusic();
    const { playSong } = useMusicPlayer();
    const [searchQuery, setSearchQuery] = useState("");
    const { isOffline } = useOfflineStatus()
    useEffect(() => {
        getHome();
    }, [isOffline]);

    const handlePlay = useCallback(async (songId: string) => {
        await playSong(songId, {});
    }, [playSong]);

    const handleSearch = useCallback(() => {
        const query = searchQuery.trim();
        if (query.length > 0) {
            navigation.navigate("SearchPage", { param: query });
            setSearchQuery("");
        }
    }, [searchQuery, navigation]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            padding: 4,
            backgroundColor: theme.colors.background,
        },
        navbar: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            elevation: 2,
        },
        title: {
            fontWeight: "bold",
            fontSize: 20,
            color: theme.colors.primary,
        },
        searchContainer: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            borderRadius: 24,
            paddingHorizontal: 12,
            height: 48,
            backgroundColor: theme.colors.elevation.level1,
        },
        searchInput: {
            flex: 1,
            backgroundColor: "transparent",
            fontSize: 16,
            color: theme.colors.onSurface,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 10,
            color: theme.colors.onBackground,
        },
        card: {
            width: 160,
            marginRight: 16,
        },
        thumbnail: {
            width: "100%",
            height: 140,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            backgroundColor: "#333",
        },
        songTitle: {
            fontSize: 14,
            fontWeight: "bold",
            color: theme.colors.onSurface,
        },
        artistText: {
            fontSize: 14,
            color: theme.colors.onSurfaceVariant || "#bbb",
        },
        errorText: {
            textAlign: "center",
            color: theme.colors.error || "red",
            marginTop: 10,
        },
    }), [theme]);

    const renderItem = useCallback(({ item, index, sectionTitle }: any) => {
        const title = item.title ?? "Unknown";
        const artists = item.artists ?? [];
        const thumbnail = item.thumbnails?.[item.thumbnails.length - 1]?.url;
        const category = getCategory(item);

        return (
            <TouchableOpacity
                style={styles.card}
                key={`${sectionTitle}-${index}`}
                onLongPress={() => {
                    if (category === "Song/Video") {
                        navigation.navigate("SongDetails", { videoId: item.videoId })
                    } else if (category === "Album" && item.browseId) {
                        navigation.navigate("Album", { albumId: item.browseId });
                    } else if (category === "Playlist" && item.playlistId) {
                        navigation.navigate("Playlist", { playlistId: item.playlistId });
                    }
                }}
                onPress={() => {
                    if (category === "Song/Video") {
                        handlePlay(item.videoId);
                    } else if (category === "Album" && item.browseId) {
                        navigation.navigate("Album", { albumId: item.browseId });
                    } else if (category === "Playlist" && item.playlistId) {
                        navigation.navigate("Playlist", { playlistId: item.playlistId });
                    }
                }}
            >
                <Card style={{ backgroundColor: theme.colors.surface }}>
                    {thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
                    ) : (
                        <ActivityIndicator size="small" style={styles.thumbnail} />
                    )}
                    <Card.Content>
                        <Text numberOfLines={1} style={styles.songTitle}>
                            {title}
                        </Text>
                        <Text style={styles.artistText}>
                            {artists.map((artist: { id: any; name: string }, i: number) => (
                                <Text
                                    key={artist.id || i}
                                    onPress={() => {
                                        if (artist.id) {
                                            navigation.navigate("Artist", { artistId: artist.id });
                                        }
                                    }}
                                    style={[
                                        styles.artistText,
                                        artist.id && { textDecorationLine: "underline" },
                                    ]}
                                >
                                    {artist.name}
                                    {i < artists.length - 1 ? ", " : ""}
                                </Text>
                            ))}
                        </Text>
                    </Card.Content>
                </Card>
            </TouchableOpacity>
        );
    }, [handlePlay, navigation, theme.colors.surface, styles]);

    if (isOffline) {
        return <OfflinePage />
    }
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return <Text style={styles.errorText}>{error}</Text>;
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.navbar}>
                    <Text style={styles.title}>Harmonix</Text>
                    <View style={styles.searchContainer}>
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                            mode="outlined"
                            outlineColor="transparent"
                            activeOutlineColor="transparent"
                            left={
                                <TextInput.Icon
                                    icon="magnify"
                                    onPress={handleSearch}
                                    color={theme.colors.onSurfaceVariant}
                                />
                            }
                            theme={{
                                colors: {
                                    primary: theme.colors.primary,
                                    background: theme.colors.elevation.level1,
                                },
                            }}
                        />
                    </View>
                </View>

                {homeData?.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <FlatList
                            data={section.contents.filter(Boolean)}
                            horizontal
                            keyExtractor={(_, idx) => `${section.title}-${idx}`}
                            showsHorizontalScrollIndicator={false}
                            windowSize={5}
                            initialNumToRender={4}
                            maxToRenderPerBatch={5}
                            updateCellsBatchingPeriod={16}
                            removeClippedSubviews
                            renderItem={({ item, index }) =>
                                renderItem({ item, index, sectionTitle: section.title })
                            }
                        />
                    </View>
                ))}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default React.memo(HomeScreen);
