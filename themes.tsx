import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";

// 🎨 Define Themes
const themes = {
    peach: {
        ...MD3LightTheme,
        colors: {
            ...MD3LightTheme.colors,
            primary: "#f3d3af",        // Soft peach
            secondary: "#e59866",      // Warm beige/orange
            background: "#fff7f0",     // Very light peach background
            surface: "#ffe8d6",        // Light creamy surface
            text: "#4e342e",           // Deep brown for contrast
        },
    },
    dark: {
        ...MD3DarkTheme,
        colors: {
            ...MD3DarkTheme.colors,
            primary: "#ff4b2b",
            secondary: "#007bff",
            background: "#121212",
            surface: "#1e1e1e",
            text: "#ffffff",
        },
    },
    light: {
        ...MD3LightTheme,
        colors: {
            ...MD3LightTheme.colors,
            primary: "#007bff",
            secondary: "#ff4b2b",
            background: "#f5f5f5",
            surface: "#ffffff",
            text: "#000000",
        },
    },
    purple: {
        ...MD3DarkTheme,
        colors: {
            ...MD3DarkTheme.colors,
            primary: "#bb86fc",         // Vibrant soft purple (Material Design recommended)
            secondary: "#7f39fb",       // Deep violet for accents
            background: "#1e1b2e",      // Dark indigo background
            surface: "#2a2540",         // Rich surface with subtle contrast
            onPrimary: "#000000",       // Text/icon color on primary (used by some Paper components)
            onSurface: "#e0e0e0",       // Text/icon on surfaces
            onBackground: "#ffffff",
            text: "#e0d7f5",            // Light lavender text
        },
    },

    green: {
        ...MD3LightTheme,  // ✅ Ensure it's based on a full theme object
        colors: {
            ...MD3LightTheme.colors,
            primary: "#27ae60",
            secondary: "#2ecc71",
            background: "#eafaf1",
            surface: "#d4efdf",
            text: "#145a32",
        },
    },
    blue: {
        ...MD3LightTheme,  // ✅ Ensure it's based on a full theme object
        colors: {
            ...MD3LightTheme.colors,
            primary: "#3498db",
            secondary: "#2980b9",
            background: "#ecf5ff",
            surface: "#d6eaf8",
            text: "#154360",
        },
    },
    orange: {
        ...MD3DarkTheme,  // ✅ Ensure it's based on a full theme object
        colors: {
            ...MD3DarkTheme.colors,
            primary: "#e67e22",
            secondary: "#d35400",
            background: "#2f1e1e",
            surface: "#4a2c2c",
            text: "#f4f1e8",
        },
    },
    cyber: {
        ...MD3DarkTheme,  // ✅ Ensure it's based on a full theme object
        colors: {
            ...MD3DarkTheme.colors,
            primary: "#00ffff",
            secondary: "#ff00ff",
            background: "#050505",
            surface: "#0f0f0f",
            text: "#00ffcc",
        },
    },
};

// 🌍 Theme Context Interface
interface ThemeContextType {
    themeMode: keyof typeof themes;
    setTheme: (theme: keyof typeof themes) => void;
}

// 🌍 Create Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
    const [themeMode, setThemeMode] = useState<keyof typeof themes>("dark");

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = (await AsyncStorage.getItem("theme")) as keyof typeof themes;
            if (savedTheme) setThemeMode(savedTheme);
        };
        loadTheme();
    }, []);

    useEffect(() => {
        AsyncStorage.setItem("theme", themeMode);
    }, [themeMode]);

    return (
        <ThemeContext.Provider value={{ themeMode, setTheme: setThemeMode }}>
            <PaperProvider theme={themes[themeMode]}>
                <View style={{ flex: 1, backgroundColor: themes[themeMode].colors.background }}>
                    {children}
                </View>
            </PaperProvider>
        </ThemeContext.Provider>
    );
}

// 🔥 Hook to use Theme Context
export function useThemeToggle() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useThemeToggle must be used within ThemeProviderWrapper");
    }
    return context;
}
