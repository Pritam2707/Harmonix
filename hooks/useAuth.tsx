import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CookieManager from "@react-native-cookies/cookies";
import RNFS from "react-native-fs";
import { sha1 } from "js-sha1";
import { WebView } from "react-native-webview";
import { Alert } from "react-native";
import SplashScreen from 'react-native-splash-screen';
const YOUTUBE_LOGIN_URL =
    "https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&passive=true&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26next%3Dhttps%253A%252F%252Fmusic.youtube.com%252F";

const BROWSER_JSON_PATH = `${RNFS.DocumentDirectoryPath}/browser.json`;

const YT_WEB_REMIX_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "X-Goog-Api-Key": "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
    "x-origin": "https://music.youtube.com",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/json",
    "X-Goog-AuthUser": "0",
    "Referer": "https://music.youtube.com/",
    "X-Youtube-Client-Name": "67",
    "X-Youtube-Client-Version": "1.20240319.01.00",
    "X-Youtube-Device": "cbr=Windows",
    "X-Youtube-Page-CL": "567891234",
    "X-Youtube-Page-Label": "youtube.ytfe.desktop_20240319",
};

interface AuthContextProps {
    isLoggedIn: boolean;
    status: string;
    checkCookies: () => void;
    reauthenticate: () => void;
    YOUTUBE_LOGIN_URL: string;
    webViewRef: React.RefObject<WebView<{}> | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [status, setStatus] = useState("🔄 Checking authentication...");
    const webViewRef = useRef<WebView | null>(null);

    useEffect(() => {
        checkSavedHeaders().then(() => {
            SplashScreen.hide();
        });
    }, []);

    useEffect(() => {
        AsyncStorage.setItem("isLoggedIn", JSON.stringify(isLoggedIn));
    }, [isLoggedIn]);

    const checkSavedHeaders = async () => {
        try {
            const fileExists = await RNFS.exists(BROWSER_JSON_PATH);
            if (fileExists) {
                console.log("✅ Found saved headers:", BROWSER_JSON_PATH);
                setIsLoggedIn(true);
                setStatus("✅ Authentication Successful!");
            } else {
                setStatus("🔄 Awaiting login...");
            }
        } catch (error) {
            console.error("⚠️ Error checking saved headers:", error);
        }
    };

    const generateSAPISIDHASH = (sapisiCookie: string) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const authString = `${timestamp} ${sapisiCookie} https://music.youtube.com`;
        const hash = sha1(authString);
        return `${timestamp}_${hash}`;
    };

    const saveHeaders = async (cookies: Record<string, any>) => {
        try {
            if (!cookies.SAPISID) {
                console.error("⚠️ SAPISID cookie not found!");
                return;
            }

            const cookieString = Object.entries(cookies)
                .map(([key, cookie]: [string, any]) => `${key}=${cookie.value}`)
                .join("; ");

            const authHeaders = {
                ...YT_WEB_REMIX_HEADERS,
                Cookie: cookieString,
                Authorization: `SAPISIDHASH ${generateSAPISIDHASH(cookies.SAPISID.value)}`,
            };

            await RNFS.writeFile(BROWSER_JSON_PATH, JSON.stringify(authHeaders, null, 4), "utf8");
            console.log("💾 Saved headers:", BROWSER_JSON_PATH);

            setIsLoggedIn(true);
            setStatus("✅ Authentication Successful!");
            Alert.alert("Login Success", "You are now authenticated!");
        } catch (error) {
            console.error("⚠️ Error saving headers:", error);
        }
    };

    const checkCookies = async () => {
        try {
            const cookies = await CookieManager.get("https://music.youtube.com");
            console.log("🍪 Extracted Cookies:", cookies);

            if (cookies.SAPISID) {
                await saveHeaders(cookies);
            } else {
                Alert.alert("Authentication Failed", "No valid YouTube Music session found.");
            }
        } catch (error) {
            console.error("⚠️ Error extracting cookies:", error);
        }
    };

    const reauthenticate = async () => {
        await AsyncStorage.removeItem("isLoggedIn");
        await AsyncStorage.removeItem("ytmusic_headers");
        await RNFS.unlink(BROWSER_JSON_PATH).catch(() => console.log("File not found, skipping deletion"));

        setIsLoggedIn(false);
        setStatus("🔄 Awaiting login...");
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, status, checkCookies, reauthenticate, YOUTUBE_LOGIN_URL, webViewRef }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }
    return context;
};
