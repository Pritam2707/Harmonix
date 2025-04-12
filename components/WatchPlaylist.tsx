import React, { useEffect, useState } from "react";
import {
    View,
    FlatList,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useMusicPlayer } from "../hooks/useMusicPlayer";

export default function WatchPlaylist() {
    const { playlist, currentIndex, skipToIndex } = useMusicPlayer();
    const { colors } = useTheme();

    const [activeIndex, setActiveIndex] = useState<number>(currentIndex);

    useEffect(() => {
        setActiveIndex(currentIndex);
    }, [currentIndex]);

    const handleSongPress = (index: number) => {
        // setActiveIndex(index);
        skipToIndex(index)
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity
            onPress={() => handleSongPress(index)}
            style={[
                styles(colors).songItem,
                index === activeIndex && styles(colors).activeSong,
            ]}
        >
            <Image
                source={{ uri: item.thumbnail[item.thumbnail.length - 1].url }}
                style={styles(colors).thumbnail}
            />
            <View style={styles(colors).textContainer}>
                <Text style={styles(colors).songTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles(colors).songArtists} numberOfLines={1}>
                    {item.artists?.map?.((a: any) => a.name).join(", ") || ""}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles(colors).container}>
            <Text style={styles(colors).header}>Upcoming</Text>
            <FlatList
                data={playlist}
                renderItem={renderItem}
                keyExtractor={(item) => item.videoId}
                extraData={activeIndex}
                contentContainerStyle={{ paddingBottom: 24 }}
            />
        </View>
    );
}

const styles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 16,
        },
        header: {
            fontSize: 24,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 16,
        },
        songItem: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        activeSong: {
            borderWidth: 2,
            borderColor: colors.primary,
        },
        thumbnail: {
            width: 60,
            height: 60,
            borderRadius: 8,
            marginRight: 12,
        },
        textContainer: {
            flex: 1,
        },
        songTitle: {
            color: colors.text,
            fontSize: 16,
            fontWeight: "600",
        },
        songArtists: {
            color: colors.secondary,
            fontSize: 14,
            marginTop: 2,
        },
    });
