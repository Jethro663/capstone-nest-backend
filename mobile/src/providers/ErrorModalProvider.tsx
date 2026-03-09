import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import type { ErrorPresentationPayload } from '@/types/api';
import { clearGlobalErrorPresenter, setGlobalErrorPresenter } from '@/api/errors';

type ErrorModalContextValue = {
  presentError: (payload: ErrorPresentationPayload) => void;
  dismissError: () => void;
};

const ErrorModalContext = createContext<ErrorModalContextValue | undefined>(undefined);

export function ErrorModalProvider({ children }: PropsWithChildren) {
  const [payload, setPayload] = useState<ErrorPresentationPayload | null>(null);

  useEffect(() => {
    setGlobalErrorPresenter(setPayload);
    return () => clearGlobalErrorPresenter();
  }, []);

  const value = useMemo(
    () => ({
      presentError: setPayload,
      dismissError: () => setPayload(null),
    }),
    [],
  );

  return (
    <ErrorModalContext.Provider value={value}>
      {children}
      <Modal animationType="fade" transparent visible={!!payload} onRequestClose={() => setPayload(null)}>
        <View className="flex-1 items-center justify-center bg-slate-950/60 px-6">
          <View className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-soft">
            <Text className="text-xs font-black uppercase tracking-[2px] text-brand-500">Nexora Error</Text>
            <Text className="mt-3 text-2xl font-black text-slate-950">
              {payload?.title ?? 'Something went wrong'}
            </Text>
            <Text className="mt-3 text-base leading-6 text-slate-600">
              {payload?.message ?? 'Please try again in a moment.'}
            </Text>
            {!!payload?.details?.length && (
              <View className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
                {payload.details.map((detail) => (
                  <Text key={detail} className="text-sm text-brand-700">
                    - {detail}
                  </Text>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => setPayload(null)}
              className="mt-6 items-center rounded-2xl bg-slate-950 px-4 py-4"
            >
              <Text className="text-sm font-black uppercase tracking-[1px] text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ErrorModalContext.Provider>
  );
}

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (!context) {
    throw new Error('useErrorModal must be used within ErrorModalProvider');
  }
  return context;
}
