import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useProgress } from 'react-native-track-player';
import { parseLRC, LrcLine } from './LRCParser';
import { useTheme } from 'react-native-paper';

type Props = {
  lrc: {
    synced: boolean;
    lyrics: string;
  } | null;
};

export const KaraokeLyrics = ({ lrc }: Props) => {
  const theme = useTheme();
  const progress = useProgress();
  const { height, width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [parsedLines, setParsedLines] = useState<LrcLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Animation for the active line
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 3,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex]);

  // Reset animation when lyrics change
  useEffect(() => {
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);
  }, [lrc?.lyrics]);

  useEffect(() => {
    if (!lrc) return;
    if (lrc.synced) {
      setParsedLines(parseLRC(lrc.lyrics));
    } else {
      setParsedLines([]);
    }
    setActiveIndex(0);
  }, [lrc]);

  useEffect(() => {
    if (!lrc || !lrc.synced || parsedLines.length === 0) return;

    const currentTime = progress.position;
    const index = parsedLines.findIndex(
      (line, i) =>
        currentTime >= line.time &&
        (i === parsedLines.length - 1 || currentTime < parsedLines[i + 1].time)
    );

    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);

      // Calculate the offset to center the active lyric
      const lineHeight = 60; // Adjust for platform differences
      const offset = Math.max(0, index * lineHeight - height / 3);

      scrollRef.current?.scrollTo({
        y: offset,
        animated: true,
      });
    }
  }, [progress.position, parsedLines, height, activeIndex, lrc]);

  if (!lrc || !lrc.lyrics.trim()) {
    return (
      <View style={[styles.noLyricsContainer, { height: height * 0.6 }]}>
        <Animated.Text
          style={[
            styles.noLyricsText,
            {
              color: theme.colors.onSurfaceVariant,
              opacity: opacityAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.7],
              }),
            }
          ]}
        >
          No lyrics found
        </Animated.Text>
      </View>
    );
  }

  return (
    <Animated.ScrollView
      horizontal={false}
      ref={scrollRef}
      style={[styles.scroll, { width }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      snapToAlignment="center"
    >
      <View style={styles.lyricsContainer}>
        {lrc.synced ? (
          parsedLines.map((line, index) => {
            const isActive = index === activeIndex;
            return (
              <Animated.Text
                key={index}
                style={[
                  styles.line,
                  {
                    color: isActive
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                    opacity: isActive
                      ? opacityAnim
                      : opacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0.8],
                      }),
                    transform: [
                      {
                        scale: isActive
                          ? scaleAnim
                          : 1
                      },
                      {
                        translateY: isActive
                          ? scaleAnim.interpolate({
                            inputRange: [1, 1.05],
                            outputRange: [0, -2],
                          })
                          : 0,
                      },
                    ],
                    textShadowColor: isActive
                      ? theme.colors.primary
                      : 'transparent',
                    textShadowOffset: isActive
                      ? { width: 0, height: 0 }
                      : undefined,
                    textShadowRadius: isActive ? 10 : 0,
                  },
                  isActive ? styles.activeLine : styles.inactiveLine,
                ]}
              >
                {line.text}
              </Animated.Text>
            );
          })
        ) : (
          <Text
            style={[
              styles.line,
              styles.plainLyrics,
              {
                color: theme.colors.onSurface,
              },
            ]}
          >
            {lrc.lyrics}
          </Text>
        )}
      </View>
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: '30%', // Better centering for lyrics
  },
  lyricsContainer: {
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  line: {
    textAlign: 'center',
    marginVertical: Platform.OS === 'ios' ? 10 : 8,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeLine: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginVertical: 12,
  },
  inactiveLine: {
    fontSize: 18,
    fontWeight: '400',
  },
  plainLyrics: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  noLyricsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noLyricsText: {
    fontSize: 18,
    textAlign: 'center',
  },
});