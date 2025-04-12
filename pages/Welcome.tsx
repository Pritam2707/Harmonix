import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App"; // Import the type
import { useNavigation } from "@react-navigation/native";

// Define the navigation type for this screen
type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Welcome">;

const WelcomeScreen = () => {
    const navigation = useNavigation<WelcomeScreenNavigationProp>();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to EchoMusic</Text>
            <Text style={styles.info}>
                This app requires access to your YouTube Music account to fetch and play songs.
            </Text>
            <Button title="Login with YouTube Music" onPress={() => navigation.navigate("Auth")} />
        </View>
    );
};

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
    },
    info: {
        fontSize: 16,
        color: "#aaa",
        textAlign: "center",
        marginBottom: 20,
    },
});

export default WelcomeScreen;
