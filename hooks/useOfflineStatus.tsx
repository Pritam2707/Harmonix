// useOfflineStatus.ts
import { useState, useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export const useOfflineStatus = () => {
    const [isOffline, setIsOffline] = useState<boolean>(false);
    const appState = useRef<AppStateStatus>('active');
    const netInfoRef = useRef<NetInfoState>(null);

    // Handle network status changes
    const handleNetworkChange = (state: NetInfoState) => {
        netInfoRef.current = state;
        const offline = !state.isConnected;
        if (isOffline !== offline) {
            console.log(`Network status changed: ${offline ? 'Offline' : 'Online'}`);
            setIsOffline(offline);
        }
    };

    // Check network status when app comes to foreground
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            try {
                const state = await NetInfo.fetch();
                handleNetworkChange(state);
            } catch (error) {
                console.warn('Failed to check network status on app resume:', error);
            }
        }
        appState.current = nextAppState;
    };

    useEffect(() => {
        // Initial network status check
        const fetchInitialState = async () => {
            const state = await NetInfo.fetch();
            handleNetworkChange(state);
        };
        fetchInitialState();

        // Set up listeners
        const unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkChange);
        const unsubscribeAppState = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            unsubscribeNetInfo();
            unsubscribeAppState.remove();
        };
    }, []);

    // Additional utility functions
    const getNetworkType = () => netInfoRef.current?.type;
    const isWifi = () => netInfoRef.current?.type === 'wifi';
    const isCellular = () => netInfoRef.current?.type === 'cellular';

    return {
        isOffline,
        getNetworkType,
        isWifi,
        isCellular,
        netInfoDetails: netInfoRef.current
    };
};