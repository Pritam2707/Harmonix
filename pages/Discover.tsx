import React, { useEffect, useState, useCallback, memo } from "react";
import { View, ScrollView, Image, TouchableOpacity, NativeModules, StyleSheet } from "react-native";
import { Text, Card, ActivityIndicator, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

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

// Memoized components to prevent unnecessary re-renders
const VideoCard = memo(({ video, onPress }: { video: Video; onPress: (id: string) => void }) => {
    const theme = useTheme();
    const lastThumbnail = video.thumbnails[video.thumbnails.length - 1];
    const aspectRatio = lastThumbnail ? lastThumbnail.width / lastThumbnail.height : 16 / 9;

    return (
        <TouchableOpacity onPress={() => onPress(video.videoId)} style={styles.videoContainer}>
            <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]}>
                <Image
                    source={{ uri: lastThumbnail?.url }}
                    style={[styles.thumbnail, { aspectRatio }]}
                    resizeMode="cover"
                />
                <Card.Content style={styles.cardContent}>
                    <Text
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={styles.videoTitle}
                    >
                        {video.title}
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
                <Text style={styles.moodText}>{mood.title}</Text>
            </Card>
        </TouchableOpacity>
    );
});

const Discover = () => {
    const navigation = useNavigation<PlaylistScreenNavigationProp>();
    const [videos, setVideos] = useState<Video[]>([]);
    const [moods, setMoods] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const { playSong } = useMusicPlayer();
    const { PythonModule } = NativeModules;

    // Fetch data with error handling
    const fetchData = useCallback(async () => {
        try {
            const [chartsRes, categoriesRes] = await Promise.all([
                PythonModule.getCharts("ZZ"),
                PythonModule.getMoodCategories()
            ]);

            const chartsData = JSON.parse(chartsRes);
            const categoriesData = JSON.parse(categoriesRes);

            if (chartsData?.videos?.items) {
                setVideos(chartsData.videos.items);
            }

            if (categoriesData["Moods & moments"]) {
                setMoods(categoriesData["Moods & moments"]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleMoodPress = useCallback((params: string) => {
        navigation.navigate("MoodPlaylists", { mood: params });
    }, [navigation]);

    const handleVideoPress = useCallback((videoId: string) => {
        playSong(videoId);
    }, [playSong]);

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.contentContainer}
        >
            <Text variant="headlineMedium" style={styles.title}>
                Discover Music
            </Text>

            <Text variant="titleLarge" style={styles.sectionTitle}>
                Moods & Moments
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moodsContainer}
            >
                {moods.map((mood) => (
                    <MoodCard
                        key={mood.params}
                        mood={mood}
                        onPress={handleMoodPress}
                    />
                ))}
            </ScrollView>

            <Text variant="titleLarge" style={styles.sectionTitle}>
                Trending Videos
            </Text>
            <View style={styles.videosContainer}>
                {videos.map((video) => (
                    <VideoCard
                        key={video.videoId}
                        video={video}
                        onPress={handleVideoPress}
                    />
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    contentContainer: {
        paddingBottom: 32,
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
        marginBottom: 8,
    },
    moodsContainer: {
        paddingVertical: 8,
    },
    moodCard: {
        marginRight: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: 100,
        alignItems: "center",
        borderRadius: 8,
    },
    moodText: {
        fontWeight: "500",
    },
    videosContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    videoContainer: {
        width: "48%",
        marginBottom: 16,
    },
    card: {
        borderRadius: 8,
        overflow: "hidden",
    },
    thumbnail: {
        width: "100%",
        maxHeight: 150,
        borderRadius: 5,
    },
    cardContent: {
        padding: 8,
    },
    videoTitle: {
        fontSize: 14,
        lineHeight: 18,
    },
});

export default Discover;