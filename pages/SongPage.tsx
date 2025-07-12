import React, { useEffect, useState, useCallback, memo, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ScrollView,
    useWindowDimensions,
    Platform
} from 'react-native';
import { usePlaybackState, useProgress, State, useActiveTrack } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { RootStackParamList } from '../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { onRemoteNext, onRemotePrevious } from '../services/PlaybackService';
import { Track } from 'services/MusicPlayerService';
import { KaraokeLyrics } from '../components/KaraokeLyrics';
import { getLyrics } from '../services/Lrclib';
import { useLyricsCache } from '../components/LyricsCacheContext';

// Memoized components
const MemoizedIcon = memo(Icon);
const MemoizedSlider = memo(Slider);
const MemoizedText = memo(Text);

type ScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const SongScreen = () => {
    const theme = useTheme();
    const playbackState = usePlaybackState();
    const progress = useProgress();
    const navigation = useNavigation<ScreenNavigationProp>();
    const currentTrack = useActiveTrack() as Track | undefined
    const { togglePlay, loading, setIsMiniPlayerVisible, queue, activeIndex } = useMusicPlayer();
    const isFocused = useIsFocused();
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;
    const [lyrics, setLyrics] = useState<{
        lyrics: string,
        synced: boolean;
    } | null>(null);
    const { cache, updateCache } = useLyricsCache();
    const lastLyricId = useRef<string | null>(null);
    const coverSizeRef = useRef({ width: 0, height: 0 });
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!currentTrack) return;

        // Create a unique cache key based on track properties
        const cacheKey = currentTrack.id;

        // Check if we have cached lyrics for this track
        if (cache[cacheKey] && lastLyricId.current !== cacheKey) {
            console.log("cache hit", cache)
            setLyrics(cache[cacheKey]);
            lastLyricId.current = cacheKey;
            return;
        }

        // Only fetch if we don't have cached lyrics or it's a different track
        if (lastLyricId.current !== cacheKey) {
            getLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration)
                .then((res) => {
                    if (res) {
                        setLyrics(res);
                        updateCache(cacheKey, res);
                        lastLyricId.current = cacheKey;
                    }
                })
                .catch(console.error);
        }
    }, [currentTrack, cache, updateCache]);


    // Player controls with memoization
    const togglePlayPause = useCallback(() => {
        togglePlay();
    }, [togglePlay]);

    const skipToNext = useCallback(() => onRemoteNext(), []);
    const skipToPrevious = useCallback(() => onRemotePrevious(), []);

    // Layout effects
    const onCoverLayout = useCallback((event: any) => {
        const { width, height } = event.nativeEvent.layout;
        coverSizeRef.current = { width, height };
    }, []);

    // Navigation handlers
    const navigateToPlaylist = useCallback(() => {
        navigation.push("WatchPlaylist");
    }, [navigation]);

    const navigateToDetails = useCallback(() => {
        if (currentTrack) {
            navigation.push("SongDetails", {
                videoId: currentTrack.id
            });
        }
    }, [navigation, currentTrack]);

    // Mini player visibility with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMiniPlayerVisible(!isFocused);
        }, 100);
        return () => clearTimeout(timer);
    }, [isFocused, setIsMiniPlayerVisible]);

    if (!currentTrack) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {isLandscape ? (
                <LandscapeLayout
                    currentTrack={currentTrack}
                    theme={theme}
                    width={width}
                    onCoverLayout={onCoverLayout}
                    coverSize={coverSizeRef.current}
                    lyrics={lyrics}
                    scrollRef={scrollRef}
                    PlayerControls={
                        <PlayerControls
                            theme={theme}
                            currentTrack={currentTrack}
                            progress={progress}
                            loading={loading}
                            playbackState={playbackState}
                            togglePlayPause={togglePlayPause}
                            skipToNext={skipToNext}
                            skipToPrevious={skipToPrevious}
                            playlist={queue}
                            currentIndex={activeIndex}
                            navigateToPlaylist={navigateToPlaylist}
                            navigateToDetails={navigateToDetails}
                            isLandscape={isLandscape}
                        />
                    }
                />
            ) : (
                <PortraitLayout
                    currentTrack={currentTrack}
                    theme={theme}
                    width={width}
                    onCoverLayout={onCoverLayout}
                    coverSize={coverSizeRef.current}
                    lyrics={lyrics}
                    scrollRef={scrollRef}
                    PlayerControls={
                        <PlayerControls
                            theme={theme}
                            currentTrack={currentTrack}
                            progress={progress}
                            loading={loading}
                            playbackState={playbackState}
                            togglePlayPause={togglePlayPause}
                            skipToNext={skipToNext}
                            skipToPrevious={skipToPrevious}
                            playlist={queue}
                            currentIndex={activeIndex}
                            navigateToPlaylist={navigateToPlaylist}
                            navigateToDetails={navigateToDetails}
                            isLandscape={isLandscape}
                        />
                    }
                />
            )}
        </View>
    );
};

// Layout components with React.memo and optimized props
const LandscapeLayout = memo(({
    currentTrack,
    theme,
    width,
    onCoverLayout,
    coverSize,
    lyrics,
    scrollRef,
    PlayerControls
}: any) => (
    <View style={styles.landscapeContainer}>
        <View style={styles.landscapeMediaContainer}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
                contentContainerStyle={styles.horizontalScrollContent}
                removeClippedSubviews={Platform.OS === 'android'}
                decelerationRate="fast"
                snapToInterval={width * 0.5}
                snapToAlignment="center"
            >
                <View style={[styles.pageContainer, { width: width * 0.5 }]}>
                    <Image
                        source={{ uri: currentTrack.artwork }}
                        style={styles.landscapeCover}
                        onLayout={onCoverLayout}
                        resizeMode="cover"
                        fadeDuration={0}
                    />
                    <MemoizedText style={[styles.swipeHint, { color: theme.colors.onSurfaceVariant }]}>
                        ◀ Swipe for Lyrics ▶
                    </MemoizedText>
                </View>
                <KaraokeLyrics lrc={lyrics} />

                {/* <View style={[styles.pageContainer, { width: width * 0.5 }]}>
                    <ScrollView
                        style={[styles.lyricsContainer, { height: coverSize.height || 'auto' }]}
                        contentContainerStyle={styles.lyricsContent}
                        removeClippedSubviews={Platform.OS === 'android'}
                    >
                        <Text style={[styles.lyricsText, { color: theme.colors.text }]}>
                            {lyrics.length > 1 ? lyrics : "No lyrics found"}
                            hello
                        </Text>
                    </ScrollView>
                </View> */}
            </ScrollView>
        </View>

        <View style={styles.landscapeControlsContainer}>
            {PlayerControls}
        </View>
    </View>
));

const PortraitLayout = memo(({
    currentTrack,
    theme,
    width,
    onCoverLayout,
    coverSize,
    lyrics,
    scrollRef,
    PlayerControls
}: any) => (
    <>
        <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
            removeClippedSubviews={Platform.OS === 'android'}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center"
        >
            <View style={[styles.pageContainer, { width }]}>
                <Image
                    source={{ uri: currentTrack.artwork }}
                    style={styles.portraitCover}
                    onLayout={onCoverLayout}
                    resizeMode="cover"
                    fadeDuration={0}
                />
                <MemoizedText style={[styles.swipeHint, { color: theme.colors.onSurfaceVariant }]}>
                    ◀ Swipe for Lyrics ▶
                </MemoizedText>
            </View>
            {/* 
            <View style={[styles.pageContainer, { width }]}>
                <ScrollView
                    style={[styles.lyricsContainer, { height: coverSize.height || 'auto' }]}
                    contentContainerStyle={styles.lyricsContent}
                    removeClippedSubviews={Platform.OS === 'android'}
                >
                    <MemoizedText style={[styles.lyricsText, { color: theme.colors.onSurfaceVariant }]}>
                        {lyrics}
                    </MemoizedText>
                </ScrollView>
            </View> */}
            <KaraokeLyrics lrc={lyrics} />

        </ScrollView>

        {PlayerControls}
    </>
));

const PlayerControls = memo(({
    theme,
    currentTrack,
    progress,
    loading,
    playbackState,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    playlist,
    currentIndex,
    navigateToPlaylist,
    navigateToDetails,
    isLandscape
}: any) => {
    const nextTrackTitle = playlist[currentIndex + 1]?.title;
    const truncatedTitle = nextTrackTitle
        ? `${nextTrackTitle.substring(0, 15)}${nextTrackTitle.length > 15 ? '...' : ''}`
        : '';

    return (
        <View style={[styles.playerControls, isLandscape && styles.landscapePlayerControls]}>
            <View style={styles.info}>
                <MemoizedText
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.title, { color: theme.colors.onSurface }]}
                >
                    {currentTrack.title}
                </MemoizedText>
                <MemoizedText
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.artist, { color: theme.colors.onSurfaceVariant }]}
                >
                    {currentTrack.artist}
                </MemoizedText>
            </View>

            <MemoizedSlider
                style={styles.slider}
                minimumValue={0}
                maximumValue={progress.duration}
                value={progress.position}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.surfaceVariant}
                thumbTintColor={theme.colors.primary}
                onSlidingComplete={(value) => TrackPlayer.seekTo(value)}
            />

            <View style={styles.timerContainer}>
                <MemoizedText style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatTime(progress.position)}
                </MemoizedText>
                <MemoizedText style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatTime(progress.duration)}
                </MemoizedText>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity
                    onPress={skipToPrevious}
                    activeOpacity={0.6}
                >
                    <MemoizedIcon name="skip-previous" size={48} color={theme.colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={togglePlayPause}
                    style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.colors.onPrimary} size="large" />
                    ) : (
                        <MemoizedIcon
                            name={playbackState.state === State.Playing ? 'pause' : 'play-arrow'}
                            size={48}
                            color={theme.colors.Text}
                        />
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={skipToNext}
                    activeOpacity={0.6}
                >
                    <MemoizedIcon name="skip-next" size={48} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={[styles.upcomingContainer, styles.rowContainer]}>
                {playlist[currentIndex + 1] && (
                    <TouchableOpacity
                        style={[styles.upcomingButton, { backgroundColor: theme.colors.primary }]}
                        onPress={navigateToPlaylist}
                        activeOpacity={0.7}
                    >
                        <MemoizedIcon name="queue-music" size={20} color={theme.colors.Text} />
                        <MemoizedText style={[styles.upcomingText, { color: theme.colors.Text }]}>
                            Upcoming: {truncatedTitle}
                        </MemoizedText>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.upcomingButton, { backgroundColor: theme.colors.primary }]}
                    onPress={navigateToDetails}
                    activeOpacity={0.7}
                >
                    <MemoizedText style={{ color: theme.colors.Text }}>
                        More
                    </MemoizedText>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    landscapeContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    landscapeMediaContainer: {
        flex: 1,
    },
    landscapeControlsContainer: {
        width: '40%',
        padding: 20,
        justifyContent: 'center',
    },
    horizontalScroll: {
        flex: 1,
    },
    horizontalScrollContent: {
        alignItems: 'center',
    },
    pageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    portraitCover: {
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        backgroundColor: '#e1e1e1',
        width: '90%',
        aspectRatio: 1,
        maxWidth: 400,
    },
    landscapeCover: {
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        backgroundColor: '#e1e1e1',
        width: '90%',
        aspectRatio: 1,
        maxHeight: '80%',
    },
    swipeHint: {
        fontSize: 12,
        marginTop: 10,
    },
    lyricsContainer: {
        width: '90%',
        maxWidth: 400,
    },
    lyricsContent: {
        padding: 10,
    },
    lyricsText: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
    },
    playerControls: {
        padding: 20,
        alignItems: 'center',
    },
    landscapePlayerControls: {
        width: '100%',
        padding: 10,
    },
    info: {
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    artist: {
        fontSize: 18,
        marginTop: 4,
        textAlign: 'center',
    },
    slider: {
        width: '100%',
        height: 40,
        marginVertical: 10,
    },
    timerContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -10,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%',
        marginVertical: 20,
    },
    playButton: {
        borderRadius: 50,
        padding: 16,
    },
    upcomingContainer: {
        marginTop: 10,
        alignItems: 'center',
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    upcomingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        elevation: 2,
        marginHorizontal: 4,
    },
    upcomingText: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: '500',
    },
});

export default memo(SongScreen);