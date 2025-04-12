import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Animated,
    PanResponder,
    GestureResponderHandlers,
} from "react-native";
import Slider from "@react-native-community/slider";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import TrackPlayer, { Event, State, usePlaybackState, useProgress } from "react-native-track-player";
import { useTheme, MD3Theme } from "react-native-paper";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../hooks/useMusicPlayer";
// Memoized formatter to prevent unnecessary re-creations
const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

type SongScreenNavigationProp = StackNavigationProp<RootStackParamList, "SongDetails">;

// For PlayerContainer
interface PlayerContainerProps {
    children: React.ReactNode;
    theme: MD3Theme;
    translateY: Animated.Value;
    panHandlers: GestureResponderHandlers;
}

// For LoadingSkeleton
interface SkeletonProps {
    theme: MD3Theme;
}

// For SeekBar
interface SeekBarProps {
    duration: number;
    seekPosition: number;
    isSeeking: boolean;
    onValueChange: (value: number) => void;
    onSeekStart: () => void;
    onSeekComplete: (value: number) => void;
    theme: MD3Theme;
}

// For TimeDisplay
interface TimeDisplayProps {
    position: number;
    duration: number;
    theme: MD3Theme;
}

// For PlayerControls
interface PlayerControlsProps {
    onPrevious: () => void;
    onNext: () => void;
    onTogglePlayback: () => void;
    playbackState: State;
    theme: MD3Theme;
}

// For VolumeControl
interface VolumeControlProps {
    volume: number;
    onVolumeChange: (value: number) => void;
    theme: MD3Theme;
}

// For ControlButton
interface ControlButtonProps {
    onPress: () => void;
    icon: string;
    theme: MD3Theme;
}
export default function AudioPlayer() {
    const theme = useTheme();
    const navigation = useNavigation<SongScreenNavigationProp>();
    const playbackState = usePlaybackState();
    const { position, duration } = useProgress();

    const { currentTrack, stop, loading } = useMusicPlayer();
    // State management
    const [volume, setVolume] = useState(1);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekPosition, setSeekPosition] = useState(position);
    const translateY = useRef(new Animated.Value(0)).current;


    const playNextSong = async () => {
        try {
            await TrackPlayer.skipToNext();
        } catch { }
    };

    const playPreviousSong = async () => {
        try {
            await TrackPlayer.skipToPrevious();
        } catch { }
    }
    const StopMusicPlayback = () => {
        stop();
    }

    // Memoized track details to prevent unnecessary re-renders
    const trackDetails = useMemo(() => ({
        title: currentTrack?.videoDetails.title || "Loading...",
        artist: currentTrack?.videoDetails.author || "Unknown",
        thumbnail: currentTrack?.videoDetails.thumbnail.thumbnails[currentTrack?.videoDetails.thumbnail.thumbnails.length - 1].url || "https://via.placeholder.com/60",
        id: currentTrack?.videoDetails.videoId
    }), [currentTrack]);

    // Animation effects
    useEffect(() => {
        if (currentTrack) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 8,
            }).start();
        }
    }, [currentTrack]);

    // Sync seek position with player position (when not seeking)
    useEffect(() => {
        if (!isSeeking) {
            setSeekPosition(position);
        }
    }, [position]);

    // Optimized pan responder with memoization
    const panResponder = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
        onPanResponderMove: Animated.event(
            [null, { dy: translateY }],
            { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, gesture) => {
            if (gesture.dy > 100) {
                Animated.timing(translateY, {
                    toValue: 200,
                    duration: 250,
                    useNativeDriver: true,
                }).start(() => {
                    StopMusicPlayback();
                    translateY.setValue(0);
                });
            } else {
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 8,
                }).start();
            }
        },
    }), []);

    // Memoized event handlers
    const handleSeekComplete = useCallback(async (value: number) => {
        setIsSeeking(false);
        await TrackPlayer.seekTo(value);
    }, []);

    const handleVolumeChange = useCallback(async (value: number) => {
        setVolume(value);
        await TrackPlayer.setVolume(value);
    }, []);

    const navigateToDetails = useCallback(() => {
        if (!loading && trackDetails.id) {
            navigation.navigate("SongDetails", { videoId: trackDetails.id });
        }
    }, [trackDetails.id, loading]);

    const navigateToWatchPlaylist = useCallback(() => {
        if (!loading && trackDetails.id) {
            navigation.navigate("WatchPlaylist");
        }
    }, [trackDetails.id, loading]);

    const togglePlayback = useCallback(async () => {
        if (playbackState.state === State.Playing) {
            await TrackPlayer.pause();
        } else {
            await TrackPlayer.play();
        }
    }, [playbackState.state]);

    // Loading skeleton
    if (loading) {
        return (
            <PlayerContainer
                theme={theme}
                translateY={translateY}
                panHandlers={panResponder.panHandlers}
            >
                <LoadingSkeleton theme={theme} />
            </PlayerContainer>
        );
    }

    if (!currentTrack && !loading) return null;

    return (
        <PlayerContainer
            theme={theme}
            translateY={translateY}
            panHandlers={panResponder.panHandlers}
        >
            <TouchableOpacity onPress={navigateToDetails} activeOpacity={0.7}>
                <Image
                    source={{ uri: trackDetails.thumbnail }}
                    style={styles.thumbnail}
                />
            </TouchableOpacity>

            <View style={styles.trackInfo}>
                <TouchableOpacity onPress={navigateToWatchPlaylist} activeOpacity={0.7}>
                    <Text
                        style={[styles.title, { color: theme.colors.onSurface }]}
                        numberOfLines={1}
                    >
                        {trackDetails.title}
                    </Text>
                    <Text style={[styles.artist, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                        {trackDetails.artist}
                    </Text>
                </TouchableOpacity>


                <SeekBar
                    duration={duration}
                    seekPosition={seekPosition}
                    isSeeking={isSeeking}
                    onValueChange={setSeekPosition}
                    onSeekStart={() => setIsSeeking(true)}
                    onSeekComplete={handleSeekComplete}
                    theme={theme}
                />

                <TimeDisplay
                    position={seekPosition}
                    duration={duration}
                    theme={theme}
                />
            </View>

            <PlayerControls
                onPrevious={playPreviousSong}
                onNext={playNextSong}
                onTogglePlayback={togglePlayback}
                playbackState={playbackState.state as State}
                theme={theme}
            />

            <VolumeControl
                volume={volume}
                onVolumeChange={handleVolumeChange}
                theme={theme}
            />
        </PlayerContainer>
    );
}

// Extracted components for better readability and performance

const PlayerContainer: React.FC<PlayerContainerProps> = ({ children, theme, translateY, panHandlers }) => (
    <Animated.View
        style={{
            position: "absolute",
            bottom: 80,
            left: "5%",
            width: "90%",
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            padding: 10,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: theme.colors.shadow,
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
            transform: [{ translateY }],
        }}
        {...panHandlers}
    >
        {children}
    </Animated.View>
);
const LoadingSkeleton: React.FC<SkeletonProps> = ({ theme }) => (
    <>
        <View style={styles.skeletonThumbnail(theme)} />
        <View style={{ flex: 1 }}>
            <View style={styles.skeletonText(theme, '80%')} />
            <View style={styles.skeletonText(theme, '50%')} />
            <View style={styles.skeletonProgress(theme)} />
        </View>
        <View style={styles.skeletonButton(theme)} />
    </>
);

const SeekBar: React.FC<SeekBarProps> = ({
    duration,
    seekPosition,
    isSeeking,
    onValueChange,
    onSeekStart,
    onSeekComplete,
    theme
}) => (
    <Slider
        style={styles.seekBar}
        minimumValue={0}
        maximumValue={duration || 1}
        value={seekPosition}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.outline}
        thumbTintColor={theme.colors.primary}
        onValueChange={onValueChange}
        onSlidingStart={onSeekStart}
        onSlidingComplete={onSeekComplete}
    />
);

const TimeDisplay: React.FC<TimeDisplayProps> = ({ position, duration, theme }) => (
    <View style={styles.timeContainer}>
        <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
            {formatTime(position)}
        </Text>
        <Text style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
            {formatTime(duration)}
        </Text>
    </View>
);

const PlayerControls: React.FC<PlayerControlsProps> = ({
    onPrevious,
    onNext,
    onTogglePlayback,
    playbackState,
    theme
}) => (
    <>
        <ControlButton onPress={onPrevious} icon="skip-previous" theme={theme} />
        <ControlButton
            onPress={onTogglePlayback}
            icon={playbackState === State.Playing ? "pause" : "play-arrow"}
            theme={theme}
        />
        <ControlButton onPress={onNext} icon="skip-next" theme={theme} />
    </>
);

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange, theme }) => (
    <View style={styles.volumeContainer}>
        <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.outline}
            thumbTintColor={theme.colors.primary}
            onSlidingComplete={onVolumeChange}
        />
    </View>
);

const ControlButton: React.FC<ControlButtonProps> = ({ onPress, icon, theme }) => (
    <TouchableOpacity onPress={onPress}>
        <MaterialIcons name={icon} size={30} color={theme.colors.onSurface} />
    </TouchableOpacity>
);
// Style objects
const styles = {
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10
    },
    trackInfo: {
        flex: 1
    },
    title: {
        fontWeight: "bold" as "bold"
    },
    artist: {
        fontSize: 14
    },
    seekBar: {
        width: "100%" as "100%",
        height: 20
    },
    timeContainer: {
        flexDirection: "row" as "row",
        justifyContent: "space-between" as "space-between"
    },
    timeText: {
        fontSize: 12
    },
    volumeContainer: {
        marginLeft: 0,
        width: 20,
        position: "relative" as "relative",
        right: 40
    },
    volumeSlider: {
        width: 100,
        height: 10,
        transform: [{ rotate: "-90deg" }]
    },
    skeletonThumbnail: (theme: any) => ({
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
        backgroundColor: theme.colors.onSurfaceVariant,
        opacity: 0.3
    }),
    skeletonText: (theme: any, width: any) => ({
        width,
        height: 15,
        backgroundColor: theme.colors.onSurfaceVariant,
        opacity: 0.3,
        borderRadius: 5,
        marginBottom: 5
    }),
    skeletonProgress: (theme: any) => ({
        width: "100%" as "100%",
        height: 8,
        backgroundColor: theme.colors.onSurfaceVariant,
        opacity: 0.3,
        borderRadius: 5
    }),
    skeletonButton: (theme: any) => ({
        width: 30,
        height: 30,
        backgroundColor: theme.colors.onSurfaceVariant,
        opacity: 0.3,
        borderRadius: 15
    })
};