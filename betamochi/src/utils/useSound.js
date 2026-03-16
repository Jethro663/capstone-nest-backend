import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';

export default function useSound(asset) {
  const soundRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(asset);
        console.warn('[useSound] loaded asset', asset && asset.uri ? asset.uri : asset);
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        setLoaded(true);
      } catch (e) {
        console.warn('useSound load error', e);
      }
    };

    if (asset) load();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [asset]);

  const play = async () => {
    try {
      if (soundRef.current) {
        console.warn('[useSound] playing');
        await soundRef.current.replayAsync();
      } else {
        console.warn('[useSound] no sound loaded yet');
      }
    } catch (e) {
      console.warn('useSound play error', e);
    }
  };

  return { play, loaded };
}
