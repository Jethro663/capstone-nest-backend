import { FriendlyErrorSurface } from '@/components/shared/FriendlyErrorSurface';

export default function NotFound() {
  return (
    <FriendlyErrorSurface
      mode="fullscreen"
      eyebrow="Lost In Nexora"
      code="404"
      title="Oops, this page took the wrong hallway."
      description="The page you opened is not here anymore, but your data is safe. Jump back to your dashboard and continue from there."
      actionLabel="Go to dashboard"
      actionHref="/dashboard"
      imageSrc="/images/errors/404-placeholder.svg"
      imageAlt="Nexora 404 placeholder illustration"
    />
  );
}
