import { mobileBrand } from "../theme/mobileBrand";
export const DEFAULT_MODULE_GRADIENT = 'oceanic-blue';

export const MODULE_GRADIENT_OPTIONS = [
  { id: 'oceanic-blue', label: 'GABHS Navy', colors: [mobileBrand.navy, mobileBrand.navyRaised] },
  { id: 'emerald-wave', label: 'Navy and Red', colors: [mobileBrand.navy, mobileBrand.red] },
  { id: 'violet-burst', label: 'Academic Blue', colors: [mobileBrand.navyRaised, mobileBrand.info] },
  { id: 'sunset-orange', label: 'Signal Red', colors: [mobileBrand.red, mobileBrand.redPressed] },
  { id: 'rose-dusk', label: 'Clean Slate', colors: [mobileBrand.muted, mobileBrand.navy] },
  { id: 'slate-night', label: 'Night Navy', colors: [mobileBrand.navyRaised, mobileBrand.navy] },
] as const;
