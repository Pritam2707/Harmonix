import TrackPlayer, { Event } from 'react-native-track-player';
import MusicPlayerService from './MusicPlayerService';

export const playbackService = async () => {
    console.log('Player service active');
    let isManuallySkipping = false;

    const _wasManualSkip = () => isManuallySkipping;
    const _resetManualSkip = () => { isManuallySkipping = false; };

    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('Received RemotePlay event');
        await MusicPlayerService.togglePlayback();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('Received RemotePause event');
        await MusicPlayerService.togglePlayback();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('Received RemoteNext event');
        isManuallySkipping = true;
        await MusicPlayerService.playNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('Received RemotePrevious event');
        isManuallySkipping = true;
        await MusicPlayerService.playPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('Received RemoteStop event');
        await MusicPlayerService.stop();
    });

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async ({ lastTrack, track }) => {
        if (_wasManualSkip()) {
            console.log('Manual skip detected — not auto-playing next.');
            _resetManualSkip();
            return;
        }

        if (lastTrack != null) {
            console.log(`Playback ended for ${lastTrack.title}. Now playing ${track?.title}`);
            await MusicPlayerService.playNext(); // Let smart logic decide
        }
    });
};
