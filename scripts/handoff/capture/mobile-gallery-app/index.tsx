import { registerRootComponent } from 'expo';
import React from 'react';

import MobileComponentGallery, {
  type MobileGalleryState,
} from '../mobile-component-gallery';

const validStates = new Set<MobileGalleryState>([
  'loading',
  'empty',
  'error',
  'success',
  'confirmation',
  'offline',
]);

function selectedState(): MobileGalleryState {
  if (typeof window === 'undefined') return 'loading';
  const requested = new URLSearchParams(window.location.search).get('state');
  return validStates.has(requested as MobileGalleryState)
    ? (requested as MobileGalleryState)
    : 'loading';
}

function GalleryApp() {
  return <MobileComponentGallery state={selectedState()} />;
}

registerRootComponent(GalleryApp);
