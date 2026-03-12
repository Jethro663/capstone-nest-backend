import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export default function useSound(asset) {
  const soundRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(asset);
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
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
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      console.warn('useSound play error', e);
    }
  };

  return { play };
}
