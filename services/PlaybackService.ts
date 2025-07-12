import TrackPlayer, { Event } from "react-native-track-player";
import MusicPlayerService from "./MusicPlayerService";

let isManuallySkipping = false;

const _wasManualSkip = () => isManuallySkipping;
const _resetManualSkip = () => { isManuallySkipping = false; };

// ✅ Exported versions of the event handlers
export const onRemotePlay = async () => {
    console.log("Received RemotePlay event");
    await MusicPlayerService.togglePlayback();
};

export const onRemotePause = async () => {
    console.log("Received RemotePause event");
    await MusicPlayerService.togglePlayback();
};

export const onRemoteNext = async () => {
    console.log("Received RemoteNext event");
    isManuallySkipping = true;
    await MusicPlayerService.playNext();
};

export const onRemotePrevious = async () => {
    console.log("Received RemotePrevious event");
    isManuallySkipping = true;
    await MusicPlayerService.playPrevious();
};

export const onRemoteStop = async () => {
    console.log("Received RemoteStop event");
    await MusicPlayerService.stop();
};

export const onTrackChanged = async ({ index, lastIndex, lastTrack, track }: any) => {
    if (_wasManualSkip()) {
        console.log("Manual skip detected — not auto-playing next.");
        _resetManualSkip();
        return;
    }
    if (index && lastIndex && index < lastIndex) return;

    if (lastTrack != null) {
        console.log(`Playback ended for ${lastTrack.title}. Now playing ${track?.title}`);
        await MusicPlayerService.playNext();
    }
};

// ✅ Sets up all event listeners
export const playbackService = async () => {
    console.log("Player service active");

    TrackPlayer.addEventListener(Event.RemotePlay, onRemotePlay);
    TrackPlayer.addEventListener(Event.RemotePause, onRemotePause);
    TrackPlayer.addEventListener(Event.RemoteNext, onRemoteNext);
    TrackPlayer.addEventListener(Event.RemotePrevious, onRemotePrevious);
    TrackPlayer.addEventListener(Event.RemoteStop, onRemoteStop);
    //   TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onTrackChanged);
};
