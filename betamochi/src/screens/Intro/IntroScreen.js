import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Platform, TouchableOpacity, Text } from 'react-native';
import useSound from '../../utils/useSound';


const introGif = require('../../../assets/jacademyintro.gif');

const introSoundAsset = require('../../../assets/sounds/intro.mp3');

export default function IntroScreen({ navigation }) {
  const { play, loaded } = useSound(introSoundAsset);

 
  useEffect(() => {
    console.warn('[IntroScreen] intro loaded:', loaded, 'platform:', Platform.OS);
    if (!loaded) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      play().catch((e) => {
        console.warn('[IntroScreen] autoplay failed, will show enable button', e);
        setAutoplayBlocked(true);
      });
    } else {
      play().catch((e) => console.warn('[IntroScreen] play error', e));
    }
  }, [loaded, play]);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const handleEnableAudio = async () => {
    try {
      await play();
      setAutoplayBlocked(false);
    } catch (e) {
      console.warn('[IntroScreen] manual play failed', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.imageWrapper}>
        <Image source={introGif} style={styles.image} resizeMode="contain" />
      </View>
      {Platform.OS === 'web' && autoplayBlocked && (
        <TouchableOpacity style={styles.overlay} onPress={handleEnableAudio} activeOpacity={0.8}>
          <View style={styles.overlayInner}>
            <Text style={styles.overlayText}>Tap to enable audio</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(width, height) * 0.8; 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
