import React, { useEffect, useState, useRef } from "react";
import {
    View,
    FlatList,
    Image,
    StyleSheet,
    NativeModules,
    Animated,
    Dimensions,
    RefreshControl,
    TouchableWithoutFeedback,

} from "react-native";
import {
    Text,
    ActivityIndicator,
    useTheme,
    Surface,
    TouchableRipple
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import OfflinePage from "./Offline";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

interface Artist {
    browseId: string;
    artist: string;
    subscribers: string;
    thumbnails: { url: string }[];
}

type ArtistScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const LibraryArtists: React.FC = () => {
    const [artists, setArtists] = useState<Artist[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { PythonModule } = NativeModules;
    const theme = useTheme();
    const navigation = useNavigation<ArtistScreenNavigationProp>();
    const scrollY = useRef(new Animated.Value(0)).current;
    const { isOffline } = useOfflineStatus()

    useEffect(() => {
        if (!isOffline)
            fetchArtists();
    }, [isOffline]);

    const fetchArtists = async () => {
        if (isOffline) return
        try {
            setLoading(true);
            const [LibraryArtists, SubscribedArtists, LibraryChannels] = await Promise.all([
                PythonModule.getLibraryArtists(),
                PythonModule.getLibrarySubscriptions(),
                PythonModule.getLibraryChannels()
            ]);

            const mergedData = [
                ...JSON.parse(LibraryArtists),
                ...JSON.parse(SubscribedArtists),
                ...JSON.parse(LibraryChannels),
            ];

            setArtists(mergedData);
        } catch (error) {
            console.error("Error fetching artists:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchArtists();
    };

    const renderItem = ({ item, index }: { item: Artist; index: number }) => {
        const image = item.thumbnails[item.thumbnails?.length - 1]?.url;
        const scale = scrollY.interpolate({
            inputRange: [-1, 0, CARD_HEIGHT * index, CARD_HEIGHT * (index + 2)],
            outputRange: [1, 1, 1, 0.98]
        });

        const opacity = scrollY.interpolate({
            inputRange: [-1, 0, CARD_HEIGHT * index, CARD_HEIGHT * (index + 1)],
            outputRange: [1, 1, 1, 0.5]
        });

        return (
            <Animated.View style={{ transform: [{ scale }], opacity }}>
                <TouchableRipple
                    onPress={() => navigation.navigate("Artist", { artistId: item.browseId })}
                    borderless
                    rippleColor={theme.colors.primary}
                    style={styles.cardWrapper}
                >
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Image
                            source={{ uri: image || 'https://via.placeholder.com/300' }}
                            style={styles.image}
                            blurRadius={0.5}
                        />

                        <View style={styles.cardContent}>
                            <Text
                                variant="titleMedium"
                                numberOfLines={1}
                                style={[styles.title, { color: theme.colors.onSurface }]}
                            >
                                {item.artist}
                            </Text>
                            <View style={styles.subscriberContainer}>
                                {item.subscribers && parseInt(item.subscribers) > 1 &&
                                    <>
                                        <MaterialCommunityIcons
                                            name="account-multiple"
                                            size={14}
                                            color={theme.colors.onSurfaceVariant}
                                        />
                                        <Text
                                            variant="bodySmall"
                                            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                                            numberOfLines={1}
                                        >
                                            {item.subscribers || '0'} followers
                                        </Text>
                                    </>
                                }
                            </View>
                        </View>
                    </Surface>
                </TouchableRipple>
            </Animated.View>
        );
    };

    if (isOffline) {
        return <OfflinePage />
    }
    if (loading && !refreshing) {
        return (
            <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator
                    animating={true}
                    size="large"
                    color={theme.colors.primary}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Animated.FlatList
                data={artists}
                keyExtractor={(item) => item.browseId}
                renderItem={renderItem}
                numColumns={2}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={onRefresh}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text
                            variant="headlineMedium"
                            style={[styles.heading, { color: theme.colors.onBackground }]}
                        >
                            Your Artists
                        </Text>
                        <Text
                            variant="bodyMedium"
                            style={[styles.subheading, { color: theme.colors.onSurfaceVariant }]}
                        >
                            {artists.length} artists in your library
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="account-music"
                            size={64}
                            color={theme.colors.onSurfaceVariant}
                        />
                        <Text
                            variant="titleMedium"
                            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
                        >
                            No artists found
                        </Text>
                        <TouchableWithoutFeedback onPress={fetchArtists}>
                            <Text
                                variant="bodyMedium"
                                style={[styles.retryText, { color: theme.colors.primary }]}
                            >
                                Tap to refresh
                            </Text>
                        </TouchableWithoutFeedback>
                    </View>
                }
                ListFooterComponent={<View style={styles.footer} />}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={10}
                removeClippedSubviews
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    heading: {
        fontWeight: "bold",
        marginBottom: 4,
    },
    subheading: {
        opacity: 0.8,
    },
    cardWrapper: {
        width: CARD_WIDTH,
        margin: 8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    list: {
        paddingHorizontal: 8,
        paddingTop: 16,
        paddingBottom: 24,
    },
    card: {
        borderRadius: 16,
        overflow: "hidden",
        height: CARD_HEIGHT,
        elevation: 3,
    },
    image: {
        height: '100%',
        width: '100%',
        position: 'absolute',
    },

    cardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    title: {
        fontWeight: "bold",
        marginBottom: 4,
    },
    subscriberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtitle: {
        marginLeft: 4,
        opacity: 0.9,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        marginBottom: 8,
    },
    retryText: {
        fontWeight: '500',
    },
    footer: {
        height: 80,
    },
});

export default LibraryArtists;