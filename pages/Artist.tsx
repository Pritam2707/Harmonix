import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Button, useTheme } from "react-native-paper";
import { NativeModules } from "react-native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { RootStackParamList } from "../App";
import { StackNavigationProp } from "@react-navigation/stack";

interface Artist {
    name: string;
    description?: string;
    thumbnails: { url: string }[];
    videos: { title: string; videoId: string; thumbnails: { url: string }[] }[];
    browseId: string;
    subscribers?: string;
    views?: string;
    albums?: { results: { browseId: string; title: string; thumbnails: { url: string }[] }[] };
    related?: { results: { browseId: string; title: string; thumbnails: { url: string }[]; subscribers?: string }[] };
    singles?: { results: { browseId: string; title: string; year: string; thumbnails: { url: string }[] }[] };
    songs?: {
        results: {
            title: string;
            videoId: string;
            artists: { name: string }[];
            album: { name: string };
            thumbnails: { url: string }[];
        }[]
    };
}
type NavigationProp = StackNavigationProp<RootStackParamList>;

const ArtistScreen = () => {
    const { PythonModule } = NativeModules;
    const { params } = useRoute();
    const navigation = useNavigation<NavigationProp>();
    const theme = useTheme();
    const { artistId } = params as { artistId: string };
    const { playSong } = useMusicPlayer();
    const goToAlbum = (albumId: string) => {
        navigation.navigate("Album", { albumId });
    };

    const goToArtist = (artistId: string) => {
        navigation.push("Artist", { artistId });
    };
    const [artist, setArtist] = useState<Artist | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: theme.colors.background },
        loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
        errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
        errorText: { color: theme.colors.error },
        artistInfo: { alignItems: "center", marginBottom: 20 },
        artistImage: { width: 150, height: 150, borderRadius: 75 },
        artistName: { fontSize: 24, fontWeight: "bold", marginTop: 10, color: theme.colors.onSurface },
        artistDescription: { color: theme.colors.onSurface, textAlign: "center", marginVertical: 5 },
        subscribeButton: { marginTop: 10 },
        sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: theme.colors.primary },
        itemCard: { marginRight: 10, width: 150, alignItems: "center" },
        itemThumbnail: { width: 150, height: 150, borderRadius: 8 },
        itemTitle: { marginTop: 5, fontSize: 14, textAlign: "center", color: theme.colors.onSurface },
        subText: { fontSize: 12, color: theme.colors.onSurface, textAlign: "center" },
    });

    useEffect(() => {
        const fetchArtist = async () => {
            try {
                console.log("Fetching Artist:", artistId);
                const response = await PythonModule.getArtist(artistId);
                const data = JSON.parse(response);
                setIsSubscribed(data.subscribed)
                console.log("Fetched Artist:", data);
                setArtist(data);
            } catch (error) {
                console.error("Error fetching artist:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchArtist();
    }, [artistId]);

    const handleSubscribe = async () => {
        console.log("Subscribing to artist:", artistId);
        try {
            await PythonModule.subscribeArtist(artistId);
            setIsSubscribed(true);
        } catch (error) {
            console.error("Subscription failed:", error);
        }
    };

    const handleUnsubscribe = async () => {
        if (!artist) return;
        try {
            await PythonModule.unsubscribeArtist(artist.browseId);
            setIsSubscribed(false);
        } catch (error) {
            console.error("Error unsubscribing:", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!artist) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Artist not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Artist Info */}
            <View style={styles.artistInfo}>
                <Image
                    source={{ uri: artist.thumbnails[artist.thumbnails.length - 1]?.url || "https://via.placeholder.com/150" }}
                    style={styles.artistImage}
                />
                <Text style={styles.artistName}>{artist.name}</Text>
                {artist.subscribers && <Text style={styles.subText}>{artist.subscribers} Subscribers</Text>}
                {artist.views && <Text style={styles.subText}>{artist.views}</Text>}
                {artist.description && <Text style={styles.artistDescription}>{artist.description}</Text>}

                {/* Subscribe / Unsubscribe Button */}
                <Button
                    mode={isSubscribed ? "outlined" : "contained"}
                    onPress={isSubscribed ? handleUnsubscribe : handleSubscribe}
                    style={styles.subscribeButton}
                >
                    {isSubscribed ? "Stop Following" : "Follow"}
                </Button>
            </View>

            {/* Albums Section */}
            {artist.albums && artist.albums?.results.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Albums</Text>
                    <FlatList
                        data={artist.albums.results}
                        keyExtractor={(item) => item.browseId}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.itemCard} onPress={() => goToAlbum(item.browseId
                            )}>
                                <Image source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }} style={styles.itemThumbnail} />
                                <Text style={styles.itemTitle}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </>
            )}

            {/* Related Artists Section */}
            {artist.related && artist.related?.results.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Related Artists</Text>
                    <FlatList
                        data={artist.related.results}
                        keyExtractor={(item) => item.browseId}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.itemCard} onPress={() => goToArtist(item.browseId)}>
                                <Image source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }} style={styles.itemThumbnail} />
                                <Text style={styles.itemTitle}>{item.title}</Text>
                            </TouchableOpacity>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </>
            )}

            {/* Singles Section */}
            {artist.singles && artist.singles?.results.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Singles</Text>
                    <FlatList
                        data={artist.singles.results}
                        keyExtractor={(item) => item.browseId}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.itemCard} onPress={() => goToAlbum(item.browseId)}>
                                <Image source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }} style={styles.itemThumbnail} />
                                <Text style={styles.itemTitle}>{item.title} ({item.year})</Text>
                            </TouchableOpacity>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </>
            )}

            {/* Songs Section */}
            {artist.songs && artist.songs?.results.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Songs</Text>
                    <FlatList
                        data={artist.songs.results}
                        keyExtractor={(item) => item.videoId}
                        renderItem={({ item }) => (

                            <TouchableOpacity style={styles.itemCard} onPress={() => playSong(item.videoId)}>
                                <Image source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }} style={styles.itemThumbnail} />
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                <Text style={styles.subText}>
                                    {item.artists.map((a) => a.name).join(", ")} - {item.album.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </>
            )}
        </ScrollView>
    );
};



export default ArtistScreen;
