import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
// import { View, Text } from "react-native";
// import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
// import 'react-native-url-polyfill/auto';

// Import Screens
import Home from "../pages/Home";
import Discover from "../pages/Discover";
import Account from "../pages/Account";
import WelcomeScreen from "../pages/Welcome";
import { useAuthContext } from "../hooks/useAuth";
import LibraryArtists from "../pages/ArtistLibrary";
import PlaylistPage from "../pages/LibraryPlayLists";
import { Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "App";
import { StackNavigationProp } from "@react-navigation/stack";
type NavigationProp = StackNavigationProp<RootStackParamList>;
const Tab = createBottomTabNavigator();
const Dock = () => {
    const theme = useTheme();
    const navigation = useNavigation<NavigationProp>()
    const { isLoggedIn } = useAuthContext()
    function extractYoutubeIdFromUrl(url: string): string | null {
        try {
            const match = url.match(/[?&]v=([^&]+)/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }
    useEffect(() => {
        const handleDeepLink = ({ url }: { url: string }) => {
            const videoId = extractYoutubeIdFromUrl(url);
            if (videoId) {
                console.log("Extracted video ID:", videoId);
                navigation.navigate("SongDetails", { videoId: videoId })
            }
        };

        // Listen to incoming URLs while app is running
        const subscription = Linking.addEventListener("url", handleDeepLink);

        // Check if app was opened via a deep link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        return () => subscription.remove();
    }, []);

    return (
        !isLoggedIn ? <WelcomeScreen /> :
            <Tab.Navigator
                screenOptions={({ route }: { route: { name: string } }) => ({
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: theme.colors.background,
                        height: 60,
                    },
                    tabBarActiveTintColor: theme.colors.primary,
                    tabBarInactiveTintColor: "#777",
                    tabBarIcon: ({ color, size }: { color: string; size: number }) => {

                        let iconName;
                        switch (route.name) {
                            case "Home":
                                iconName = "home";
                                break;
                            case "Discover":
                                iconName = "compass";
                                break;
                            case "Search":
                                iconName = "search";
                                break;
                            case "Playlists":
                                iconName = "musical-notes";
                                break;
                            case "Artists":
                                iconName = "people";
                                break;
                            case "Account":
                                iconName = "person";
                                break;
                            default:
                                iconName = "help-circle";
                        }
                        return <Ionicons name={iconName} size={size} color={color} />;
                    },
                })}
            >
                <Tab.Screen name="Home" component={Home} options={{ lazy: true }} />
                <Tab.Screen name="Discover" component={Discover} options={{ lazy: true }} />
                {/* <Tab.Screen name="Search" component={SearchScreen} /> */}
                <Tab.Screen name="Playlists" component={PlaylistPage} options={{ lazy: true }} />
                <Tab.Screen name="Artists" component={LibraryArtists} options={{ lazy: true }} />
                <Tab.Screen name="Account" component={Account} options={{ lazy: true }} />
            </Tab.Navigator>
    );
};

export default Dock;
