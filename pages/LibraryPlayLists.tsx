import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Alert,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    RefreshControl
} from "react-native";
import {
    ActivityIndicator,
    useTheme,
    Portal,
    Modal,
    TextInput,
    Button,
    Card,
    Title,
    Paragraph,
    IconButton,
    Chip
} from "react-native-paper";
import { NativeModules } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import OfflinePage from "./Offline";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Playlist {
    playlistId: string;
    title: string;
    thumbnails: { url: string }[];
    count: number;
    privacy?: string;
}

type PlaylistScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const PlaylistPage: React.FC = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [newDescription, setNewDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const { PythonModule } = NativeModules;
    const theme = useTheme();
    const navigation = useNavigation<PlaylistScreenNavigationProp>();
    const { isOffline } = useOfflineStatus()

    const fetchLibraryPlaylists = async () => {
        if (isOffline) return
        try {
            const res = await PythonModule.getLibraryPlaylists();
            const parsed = JSON.parse(res);
            setPlaylists(parsed);
            setError(null);
        } catch (err) {
            setError("Failed to fetch playlists. Pull down to refresh.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchLibraryPlaylists();
    };

    useEffect(() => {
        fetchLibraryPlaylists();
    }, [isOffline]);

    const handleCreate = async () => {
        if (!newTitle.trim()) {
            Alert.alert("Error", "Playlist title cannot be empty");
            return;
        }

        try {
            setLoading(true);
            await PythonModule.createPlaylist(newTitle, newDescription, "PRIVATE", null, null);
            setShowCreate(false);
            setNewTitle("");
            setNewDescription("");
            fetchLibraryPlaylists();
        } catch (err) {
            setError("Failed to create playlist. Please try again.");
        }
    };

    const handleDelete = (id: string, title: string) => {
        Alert.alert(
            "Delete Playlist",
            `Are you sure you want to delete "${title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await PythonModule.deletePlaylist(id);
                            setPlaylists((prev) => prev.filter((p) => p.playlistId !== id));
                        } catch {
                            setError("Failed to delete playlist.");
                        }
                    },
                },
            ]
        );
    };
    const renderPlaylist = ({ item }: { item: Playlist }) => (
        <View style={styles.cardWrapper}>
            <Card
                style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]}
            >
                <TouchableOpacity
                    onPress={() => navigation.navigate("Playlist", { playlistId: item.playlistId })}
                    activeOpacity={0.8}
                >
                    <Card.Cover
                        source={{
                            uri: item.thumbnails.at(-1)?.url || "https://via.placeholder.com/300x300?text=No+Image",
                        }}
                        style={styles.cardImage}
                        theme={{ roundness: 8 }}
                    />
                    <Card.Content style={styles.cardContent}>
                        <View style={styles.cardFooter}>
                            <Chip
                                mode="outlined"
                                compact
                                style={[styles.chip, { backgroundColor: theme.colors.background }]}
                                textStyle={[styles.chipText, { color: theme.colors.onSurface }]}
                            >
                                {item.count ? item.count : 0} songs
                            </Chip>
                        </View>
                    </Card.Content>
                </TouchableOpacity>
                <Card.Actions style={styles.cardActions}>
                    <Title numberOfLines={1} style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                        {item.title}
                    </Title>
                    {item.playlistId !== "LM" && item.playlistId !== "SE" && (
                        <IconButton
                            icon="delete"
                            iconColor={theme.colors.error}
                            size={20}
                            onPress={() => handleDelete(item.playlistId, item.title)}
                            style={styles.deleteButton}
                        />
                    )}
                </Card.Actions>
            </Card>
        </View>
    );


    if (isOffline) {
        return <OfflinePage />
    }
    if (loading && !refreshing) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error && playlists.length === 0) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <MaterialCommunityIcons
                    name="playlist-remove"
                    size={48}
                    color={theme.colors.error}
                    style={styles.errorIcon}
                />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                <Button
                    mode="contained"
                    onPress={fetchLibraryPlaylists}
                    style={styles.retryButton}
                >
                    Retry
                </Button>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header with Search */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}>
                        Your Library
                    </Text>
                    <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                        Playlists
                    </Title>
                </View>
                <Button
                    mode="contained-tonal"
                    onPress={() => setShowCreate(true)}
                    style={styles.createButton}
                    labelStyle={styles.createButtonLabel}
                    icon="plus"
                >
                    Create
                </Button>
            </View>

            {/* Create Playlist Modal */}
            <Portal>
                <Modal
                    visible={showCreate}
                    onDismiss={() => setShowCreate(false)}
                    contentContainerStyle={[
                        styles.modal,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                            borderWidth: 1
                        }
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <Title style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
                            New Playlist
                        </Title>
                        <IconButton
                            icon="close"
                            onPress={() => setShowCreate(false)}
                            style={styles.closeButton}
                        />
                    </View>

                    <TextInput
                        label="Title *"
                        value={newTitle}
                        onChangeText={setNewTitle}
                        mode="outlined"
                        style={styles.input}
                        theme={{ roundness: 8 }}
                        autoFocus
                    />
                    <TextInput
                        label="Description"
                        value={newDescription}
                        onChangeText={setNewDescription}
                        mode="outlined"
                        style={styles.input}
                        theme={{ roundness: 8 }}
                        multiline
                    />

                    <View style={styles.modalButtons}>
                        <Button
                            onPress={() => setShowCreate(false)}
                            mode="outlined"
                            style={styles.cancelButton}
                            labelStyle={styles.buttonLabel}
                        >
                            Cancel
                        </Button>
                        <Button
                            onPress={handleCreate}
                            mode="contained"
                            style={styles.confirmButton}
                            labelStyle={styles.buttonLabel}
                            loading={loading}
                        >
                            Create
                        </Button>
                    </View>
                </Modal>
            </Portal>

            {/* Playlist Grid with Pull-to-Refresh */}
            <FlatList
                data={playlists}
                keyExtractor={(p) => p.playlistId}
                numColumns={2}
                renderItem={renderPlaylist}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                        tintColor={theme.colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="music-box-multiple-outline"
                            size={64}
                            color={theme.colors.onSurfaceVariant}
                        />
                        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                            No playlists found
                        </Text>
                        <Button
                            mode="text"
                            onPress={() => setShowCreate(true)}
                            textColor={theme.colors.primary}
                        >
                            Create your first playlist
                        </Button>
                    </View>
                }
                ListFooterComponent={<View style={styles.footer} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cardWrapper: {
        width: CARD_WIDTH,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden'
    },
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        paddingHorizontal: 8
    },
    greeting: {
        fontSize: 14,
        opacity: 0.8
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 4
    },
    createButton: {
        borderRadius: 12,
        paddingHorizontal: 12
    },
    createButtonLabel: {
        fontSize: 14,
        fontWeight: '500'
    },
    modal: {
        padding: 20,
        margin: 20,
        borderRadius: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    closeButton: {
        marginRight: -8
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'transparent'
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 16
    },
    buttonLabel: {
        fontWeight: '500'
    },
    cancelButton: {
        marginRight: 8,
        borderRadius: 8
    },
    confirmButton: {
        borderRadius: 8,
        minWidth: 100
    },
    columnWrapper: {
        justifyContent: "space-between",
        // paddingHorizontal: 8,
        gap: 15

    },
    listContent: {
        // margin: 10,
        // paddingBottom: 24
    },
    card: {
        width: CARD_WIDTH,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden'
    },
    cardImage: {
        height: CARD_WIDTH,
        borderRadius: 8
    },

    cardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        // paddingBottom: 8
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        // marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',

    },
    chip: {
        // height: 30,
        marginRight: 4,
    },
    chipText: {
        fontSize: 12,
        lineHeight: 20
    },
    // lockIcon: {
    //     marginLeft: 'auto'
    // },
    cardActions: {
        marginLeft: -15,
        // alignItems: "center",
        justifyContent: 'flex-start',
        // paddingRight: 8,
        // paddingBottom: 8
    },
    deleteButton: {
        margin: 0
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center'
    },
    footer: {
        height: 80
    },
    errorIcon: {
        marginBottom: 16
    },
    errorText: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        maxWidth: '80%'
    },
    retryButton: {
        borderRadius: 8,
        width: 120
    }
});

export default PlaylistPage;