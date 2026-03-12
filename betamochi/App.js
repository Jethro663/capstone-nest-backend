import React from 'react';
import { View, StatusBar, Text, Switch } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/styles/colors';
import navigationRef from './src/navigation/NavigationRef';
import { SfxProvider, useSfx } from './src/context/SfxContext';

const SfxToggleBar = () => {
  const { enabled, setEnabled } = useSfx();
  return (
    <View style={{ backgroundColor: colors.white, padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.secondaryLight }}>
      <Text style={{ color: colors.textPrimary, marginRight: 8, fontWeight: '600' }}>SFX</Text>
      <Switch value={enabled} onValueChange={setEnabled} thumbColor={enabled ? colors.primary : colors.secondary} />
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={false}
      />
      <SfxProvider>
        <NavigationContainer ref={navigationRef}>
          <SfxToggleBar />
          <RootNavigator />
        </NavigationContainer>
      </SfxProvider>
    </GestureHandlerRootView>
  );
}
