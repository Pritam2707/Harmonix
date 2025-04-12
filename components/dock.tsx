import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
// import { View, Text } from "react-native";
// import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

// Import Screens
import Home from "../pages/Home";
import Discover from "../pages/Discover";
import SearchScreen from "../pages/SearchPage";
import Account from "../pages/Account";
// import { useAuthContext } from "../hooks/useAuthProvider";
import WelcomeScreen from "../pages/Welcome";
import { useAuthContext } from "../hooks/useAuth";
import { NativeModules } from "react-native";
// import Discover from "../screens/Discover";
// import Search from "../screens/Search";
// import Playlist from "../screens/Playlist";
// import Artist from "../screens/Artist";
// import Account from "../screens/Account";

const Tab = createBottomTabNavigator();
const Dock = () => {
    const theme = useTheme();
    const { isLoggedIn } = useAuthContext()

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
                            case "Playlist":
                                iconName = "musical-notes";
                                break;
                            case "Artist":
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
                <Tab.Screen name="Home" component={Home} />
                <Tab.Screen name="Discover" component={Discover} />
                <Tab.Screen name="Search" component={SearchScreen} />
                {/* <Tab.Screen name="Playlist" component={Playlist} />
            <Tab.Screen name="Artist" component={Artist} />*/}
                <Tab.Screen name="Account" component={Account} />
            </Tab.Navigator>
    );
};

export default Dock;
