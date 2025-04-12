import React, { useEffect } from "react";
import { View, Text, StyleSheet, NativeModules } from "react-native";
import { WebView } from "react-native-webview";
import { ActivityIndicator, Button, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useAuthContext } from "./hooks/useAuth";

export default function AuthScreen() {
    const { isLoggedIn, status, webViewRef, checkCookies, reauthenticate, YOUTUBE_LOGIN_URL } = useAuthContext();
    const navigation = useNavigation();
    const theme = useTheme();
    const { PythonModule } = NativeModules
    useEffect(() => {
        if (isLoggedIn) {
            setTimeout(() => {
                navigation.reset({
                    index: 0,
                    routes: [{ name: "App" as never }], // Fix: Explicitly cast as never
                });
                PythonModule.loadCookie();
            }, 1000);
        }
    }, [isLoggedIn]);


    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {!isLoggedIn ? (
                <>
                    <Text style={[styles.title, { color: theme.colors.primary }]}>Login to Continue</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.onBackground }]}>
                        This app requires access to your YouTube Music account to fetch songs. Please log in to proceed.
                    </Text>
                    <WebView
                        ref={webViewRef}
                        style={styles.webView}
                        source={{ uri: YOUTUBE_LOGIN_URL }}
                        onNavigationStateChange={(navState) => {
                            console.log("Navigated to:", navState.url);
                            if (navState.url.startsWith("https://music.youtube.com")) {
                                console.log("✅ Redirected to YouTube Music!");
                                setTimeout(checkCookies, 3000);
                            }
                        }}
                        javaScriptEnabled
                        domStorageEnabled
                    />
                </>
            ) : (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.statusText, { color: theme.colors.onBackground }]}>
                        {status || "Authenticating..."}
                    </Text>
                    <Button mode="contained" onPress={reauthenticate} style={styles.button} color={theme.colors.primary}>
                        Reauthenticate
                    </Button>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
        marginTop: 20,
    },
    subtitle: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 20,
    },
    webView: {
        flex: 1,
        borderRadius: 10,
        overflow: "hidden",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    statusText: {
        marginTop: 10,
        fontSize: 16,
    },
    button: {
        marginTop: 20,
    },
});

