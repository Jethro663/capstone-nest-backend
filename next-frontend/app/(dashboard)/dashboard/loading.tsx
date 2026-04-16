import { AppOrbitLoader } from '@/components/shared/AppOrbitLoader';

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-start justify-center px-6 py-10">
      <AppOrbitLoader
        variant="calm"
        fullScreen={false}
        message="Loading section..."
      />
    </div>
  );
}
