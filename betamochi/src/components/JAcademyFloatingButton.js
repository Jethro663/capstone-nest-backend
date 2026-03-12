import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { navigate } from '../navigation/NavigationRef';
import { useSfx } from '../context/SfxContext';
import useSound from '../utils/useSound';

const clickSoundAsset = require('../../assets/sounds/click.wav');

const JAcademyFloatingButton = () => {
  const { enabled } = useSfx();
  const { play } = useSound(clickSoundAsset);
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.button}
        onPress={() => {
          if (enabled) play();
          navigate('JAcademyHidden', { screen: 'JAcademyMain' });
        }}
      >
        <MaterialCommunityIcons name="book" size={30} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    zIndex: 0,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: colors.white,
  },
});

export default JAcademyFloatingButton;
