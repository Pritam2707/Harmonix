import { useState } from "react";
// import { runPython } from "react-native-chaquopy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HomeSection } from "../types/HomeSection";
import { SearchResult } from "../types/SearchBody";
import { Song } from "../types/Song";
import { NativeModules } from "react-native";

export function useMusic() {
    const [homeData, setHomeData] = useState<HomeSection[] | null>(null);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const { PythonModule } = NativeModules;

    const getHome = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await PythonModule.getHomeData();
            const data = JSON.parse(response);
            console.log(data)
            setHomeData(data as HomeSection[]);
        } catch (err) {
            console.log(err)
            setError("Error fetching home data");
        }
        setLoading(false);
    };

    const searchMusic = async (query: string) => {
        console.log("Searching for:", query);
        setLoading(true);
        setError(null);

        try {
            const response = await PythonModule.searchMusic(query); // ✅ Await the promise
            console.log("Raw response:", response);

            const data = JSON.parse(response); // ✅ Ensure JSON parsing
            console.log("Parsed data:", data);

            setSearchResults(data as SearchResult[]);
        } catch (err) {
            console.error("Error searching music:", err); // ✅ Log error details
            setError("Error searching music");
        }

        setLoading(false);
    };




    return {
        homeData,
        searchResults,
        loading,
        error,
        searchMusic,
        getHome,
    };
}
