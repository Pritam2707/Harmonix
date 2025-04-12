import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    StyleSheet,
    NativeModules,
    LayoutAnimation,
    Platform,
    UIManager,
} from "react-native";
import {
    useTheme,
    Avatar,
    Button,
    Card,
    Menu,
    Text,
    ActivityIndicator,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeToggle } from "../themes";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

type HistoryScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    "History"
>;

if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const AccountPage = () => {
    const theme = useTheme();
    const navigation = useNavigation<HistoryScreenNavigationProp>();
    const { themeMode, setTheme } = useThemeToggle();
    const { PythonModule } = NativeModules;

    const [account, setAccount] = useState({
        name: "",
        email: "",
        avatarUrl: "",
    });
    const [loading, setLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);

    const fetchAccountInfo = useCallback(async () => {
        setLoading(true);
        try {
            const res = await PythonModule.getAccountInfo();
            const data = JSON.parse(res);
            setAccount({
                name: data.accountName,
                email: data.channelHandle,
                avatarUrl: data.accountPhotoUrl,
            });
        } catch (err: any) {
            console.error("Failed to fetch account info:", err);
        } finally {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccountInfo();
    }, [fetchAccountInfo]);

    const handleLogout = () => {
        console.log("Logging out...");
        // TODO: Implement actual logout logic here
    };

    const themeOptions = [
        "dark",
        "light",
        "purple",
        "green",
        "blue",
        "orange",
        "cyber",
        "peach",
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Card style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
                <View style={styles.avatarContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    ) : account.avatarUrl ? (
                        <Avatar.Image size={90} source={{ uri: account.avatarUrl }} />
                    ) : (
                        <Avatar.Icon size={90} icon="account" />
                    )}
                </View>

                <Text style={[styles.name, { color: theme.colors.onSurface }]}>
                    {loading ? "Loading..." : account.name}
                </Text>
                <Text style={[styles.email, { color: theme.colors.onSurfaceVariant }]}>
                    {loading ? "Loading..." : account.email}
                </Text>

                <Button
                    mode="contained-tonal"
                    onPress={handleLogout}
                    style={styles.button}
                    icon="logout"
                >
                    Logout
                </Button>

                <Button
                    mode="contained-tonal"
                    onPress={() => navigation.push("History")}
                    style={styles.button}
                    icon="history"
                >
                    View History
                </Button>

                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <Button
                            mode="contained"
                            style={styles.button}
                            icon="theme-light-dark"
                            onPress={() => setMenuVisible(true)}
                        >
                            Select Theme
                        </Button>
                    }
                >
                    {themeOptions.map((option) => (
                        <Menu.Item
                            key={option}
                            onPress={() => {
                                setTheme(option as "dark" | "light" | "purple" | "green" | "blue" | "orange" | "cyber" | "peach");
                                setMenuVisible(false);
                            }}
                            title={option.charAt(0).toUpperCase() + option.slice(1)}
                        />
                    ))}
                </Menu>
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    card: {
        width: "100%",
        padding: 24,
        borderRadius: 20,
        alignItems: "center",
        elevation: 3,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        marginBottom: 20,
    },
    button: {
        marginVertical: 6,
        width: "100%",
        borderRadius: 12,
    },
});

export default AccountPage;
