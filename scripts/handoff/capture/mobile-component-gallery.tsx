import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  AuthStatusBanner,
} from '../../../mobile/src/components/auth/MobileAuthPrimitives';
import { OfflineWorkspaceNotice } from '../../../mobile/src/components/offline/OfflineWorkspaceNotice';
import { TeacherConfirmModal } from '../../../mobile/src/components/teacher/TeacherConfirmModal';
import {
  Card,
  EmptyState,
  LoadingCard,
} from '../../../mobile/src/components/ui/primitives';
import { mobileBrand } from '../../../mobile/src/theme/mobileBrand';

export type MobileGalleryState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'success'
  | 'confirmation'
  | 'offline';

export interface MobileComponentGalleryProps {
  state: MobileGalleryState;
}

const galleryCopy: Record<MobileGalleryState, { title: string; purpose: string }> = {
  loading: {
    title: 'Loading',
    purpose: 'The screen keeps its structure while data is being prepared.',
  },
  empty: {
    title: 'Nothing here yet',
    purpose: 'An empty result explains the situation instead of looking broken.',
  },
  error: {
    title: 'Unable to load this workspace',
    purpose: 'The message identifies the failure and points to a safe retry.',
  },
  success: {
    title: 'Saved successfully',
    purpose: 'The message confirms the completed action and resulting state.',
  },
  confirmation: {
    title: 'Confirm archive',
    purpose: 'The decision names the consequence before anything is changed.',
  },
  offline: {
    title: 'Offline snapshot',
    purpose: 'The notice explains that editing requires a connection.',
  },
};

export function MobileComponentGallery({ state }: MobileComponentGalleryProps) {
  const copy = galleryCopy[state];
  return (
    <View style={{ flex: 1, backgroundColor: mobileBrand.background }}>
      <View
        style={{
          backgroundColor: mobileBrand.navy,
          paddingHorizontal: 22,
          paddingBottom: 22,
          paddingTop: 56,
        }}
      >
        <Text style={{ color: mobileBrand.white, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>
          NEXORA COMPONENT REFERENCE
        </Text>
        <Text style={{ color: mobileBrand.white, fontSize: 28, fontWeight: '900', marginTop: 8 }}>
          {copy.title}
        </Text>
        <Text style={{ color: mobileBrand.white, fontSize: 14, lineHeight: 20, marginTop: 7, opacity: 0.82 }}>
          {copy.purpose}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ gap: 14, padding: 22 }}>
        {state === 'loading' ? (
          <>
            <LoadingCard height={112} />
            <LoadingCard height={168} />
            <LoadingCard height={96} />
          </>
        ) : null}

        {state === 'empty' ? (
          <Card>
            <EmptyState
              emoji="📭"
              title="Nothing here yet"
              subtitle="New items will appear here when they are ready."
            />
          </Card>
        ) : null}

        {state === 'error' ? (
          <AuthStatusBanner
            tone="error"
            message="This workspace could not be loaded. Check the connection, then retry."
          />
        ) : null}

        {state === 'success' ? (
          <AuthStatusBanner
            tone="success"
            message="Your changes were saved successfully."
          />
        ) : null}

        {state === 'offline' ? (
          <OfflineWorkspaceNotice lastSyncedAt="2026-10-01T08:30:00.000+08:00" />
        ) : null}

        {state === 'confirmation' ? (
          <Card>
            <Text style={{ color: mobileBrand.text, fontSize: 16, fontWeight: '800' }}>
              Class workspace
            </Text>
            <Text style={{ color: mobileBrand.muted, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
              The modal demonstrates the current guarded decision pattern.
            </Text>
          </Card>
        ) : null}
      </ScrollView>

      <TeacherConfirmModal
        visible={state === 'confirmation'}
        title="Confirm archive"
        description="The account will be archived, while academic records remain available for audit and reporting."
        confirmLabel="Archive account"
        cancelLabel="Keep account"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />
    </View>
  );
}

export default MobileComponentGallery;
