import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Text, Card, ActivityIndicator, IconButton, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
import { getHistory, SongHistory } from "../services/HistoryService";



const History: React.FC = () => {
    // const { playSong } = useMusicPlayer();
    const [history, setHistory] = useState<SongHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const { playSong } = useMusicPlayer()
    const navigation = useNavigation();
    const theme = useTheme();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const historyData = await getHistory();
                if (historyData) {
                    setHistory(historyData);
                }
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handlePlay = (videoId: string) => {
        playSong(videoId)
    };

    if (loading) return (
        <View style={[styles.loader, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>Listening History</Text>
            </View>
            {history.length === 0 ? (
                <Text style={[styles.noHistory, { color: theme.colors.onSurfaceVariant }]}>No history available.</Text>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.videoId}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handlePlay(item.videoId)} style={styles.cardContainer}>
                            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                                <Card.Cover source={{ uri: item.artwork }} style={styles.image} />
                                <Card.Content>
                                    <Text variant="bodyLarge" numberOfLines={1} style={[styles.title, { color: theme.colors.onSurface }]}>
                                        {item.title}
                                    </Text>
                                    <Text variant="bodyMedium" style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}>
                                        {item.artist}
                                    </Text>
                                    <Text variant="bodySmall" style={[styles.played, { color: theme.colors.outline }]}>
                                        {new Date(item.played as string)?.toLocaleString()}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    noHistory: {
        textAlign: "center",
        marginTop: 20,
    },
    row: {
        justifyContent: "space-between",
    },
    cardContainer: {
        width: "48%",
        marginBottom: 10,
    },
    card: {
        borderRadius: 12,
        overflow: "hidden",
    },
    image: {
        height: 180,
    },
    title: {
        fontWeight: "bold",
    },
    artist: {},
    played: {
        fontSize: 12,
        marginTop: 5,
    },
});

export default History;