import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';

interface OfflinePageProps {
    onRetry?: () => void;
}

const OfflinePage: React.FC<OfflinePageProps> = ({ onRetry }) => {
    const theme = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                {/* Animated offline illustration */}


                <Text
                    variant="headlineMedium"
                    style={[styles.title, { color: theme.colors.onBackground }]}
                >
                    Connection Lost
                </Text>

                <Text
                    variant="bodyLarge"
                    style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                    Oops! Looks like you're offline. Please check your internet connection and try again.
                </Text>

                <IconButton
                    icon="wifi-refresh"
                    mode="contained"
                    size={40}
                    onPress={onRetry}
                    iconColor={theme.colors.onPrimary}
                    containerColor={theme.colors.primary}
                    style={styles.retryButton}
                />

                <Text
                    variant="labelMedium"
                    style={[styles.tip, { color: theme.colors.outline }]}
                >
                    Tip: Try switching to a different network or turning on mobile data
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        paddingBottom: 80, // Space for bottom button
    },
    animation: {
        width: 250,
        height: 250,
        marginBottom: 24,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        maxWidth: 300,
    },
    retryButton: {
        marginTop: 16,
        marginBottom: 24,
    },
    tip: {
        textAlign: 'center',
        fontStyle: 'italic',
        maxWidth: 280,
    },
});

export default OfflinePage;