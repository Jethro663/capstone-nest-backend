import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

const SfxContext = createContext({ enabled: false, setEnabled: () => {} });

export const SfxProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(true);

  return (
    <SfxContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </SfxContext.Provider>
  );
};

export const useSfx = () => useContext(SfxContext);

export default SfxContext;
