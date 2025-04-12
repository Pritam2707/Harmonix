import React, { useEffect, useCallback } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useMusic } from "../hooks/useMusic";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { useNavigation } from "@react-navigation/native";
import { useTheme, Card, ActivityIndicator } from "react-native-paper";
import { getCategory } from "../hooks/getCategory";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Album">;

const HomeScreen = () => {
    const theme = useTheme();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { homeData, loading, error, getHome } = useMusic();
    const { playSong } = useMusicPlayer();

    useEffect(() => {
        getHome();
    }, []);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            padding: 4,
        },
        navbar: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
        },
        title: {
            fontSize: 20,
            fontWeight: "bold",
            color: theme.colors.onBackground,
        },
        searchContainer: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: 8,
            paddingHorizontal: 10,
            flex: 1,
            maxWidth: 400,
        },
        searchInput: {
            flex: 1,
            color: theme.colors.onBackground,
            paddingVertical: 8,
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
    });

    const handlePlay = useCallback(
        async (songId: string) => {
            await playSong(songId);
        },
        [playSong]
    );

    if (loading)
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );

    if (error) return <Text style={styles.errorText}>{error}</Text>;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 30, color: theme.colors.onSurface, margin: 20, marginHorizontal: 10 }}>Harmonix</Text>

                {homeData?.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <FlatList
                            data={section.contents.filter(item => item !== null)}
                            horizontal
                            keyExtractor={(item, idx) => `${section.title}-${idx}`}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const title = item.title ?? "Unknown";
                                const artists = item.artists ?? [];
                                const thumbnail = item.thumbnails?.[item.thumbnails.length - 1]?.url;
                                const category = getCategory(item);

                                return (
                                    <TouchableOpacity
                                        style={styles.card}
                                        onPress={() => {
                                            if (category === "Song/Video") {
                                                handlePlay(item.videoId);
                                            } else if (category === "Album" && item.browseId) {
                                                navigation.navigate("Album", { albumId: item.browseId });
                                            } else if (category === "Playlist" && item.playlistId) {
                                                console.log(item.playlistId);
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
                                                <Text
                                                    style={styles.songTitle}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {title}
                                                </Text>
                                                <Text style={styles.artistText}>
                                                    {artists.map((artist, i) => (
                                                        <Text
                                                            key={artist.id || i}
                                                            style={[styles.artistText, i < artists.length - 1 && { textDecorationLine: "underline" }]}
                                                            onPress={() => {
                                                                if (i < artists.length - 1) {
                                                                    navigation.navigate("Artist", { artistId: artist.id });
                                                                }
                                                            }}
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
                            }}
                        />
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

export default HomeScreen;
