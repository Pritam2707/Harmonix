import React, { useCallback, memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native-gesture-handler";

// Define the navigation type for this screen
type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Welcome">;

const WelcomeScreen = () => {
    const navigation = useNavigation<WelcomeScreenNavigationProp>();

    // Memoize the navigation callback
    const handleLoginPress = useCallback(() => {
        navigation.navigate("Auth");
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                Welcome to EchoMusic
            </Text>
            <Text style={styles.info}>
                This app requires access to your YouTube Music account to fetch and play songs.
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={handleLoginPress}
                activeOpacity={0.7}
            >
                <Text style={styles.buttonText}>Login with YouTube Music</Text>
            </TouchableOpacity>
        </View>
    );
};

// Using StyleSheet.create for optimal performance
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#121212",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 10,
        maxWidth: '90%',
    },
    info: {
        fontSize: 16,
        color: "#aaa",
        textAlign: "center",
        marginBottom: 20,
        maxWidth: '90%',
    },
    button: {
        backgroundColor: '#4285F4',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 4,
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

// Memoize the entire component to prevent unnecessary re-renders
export default memo(WelcomeScreen);