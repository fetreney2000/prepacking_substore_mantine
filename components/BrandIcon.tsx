/**
 * The app's brand mark, rendered inline: the same artwork as `app/icon.svg`
 * (package box + hospital cross on the header gradient) so the header and
 * sign-in page can size it without an `<img>` and its lint/config baggage.
 *
 * Decorative by default — it always sits next to the app name in text, which
 * is what gets announced (1.4.1: colour and picture are never the only cue).
 *
 * Keep the paths in sync with `app/icon.svg` when the artwork changes; the
 * asset guard in BrandIcon.test.ts fails the build if they drift.
 */
export default function BrandIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="brandG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E3A8A" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7.5" fill="url(#brandG)" />
      {/* lid */}
      <rect x="4.5" y="8.5" width="23" height="4.8" rx="1.6" fill="#12B886" />
      {/* box body */}
      <rect x="6" y="13.3" width="20" height="12.2" rx="1.8" fill="#FFFFFF" />
      {/* hospital cross */}
      <path
        d="M14.1 14.6h3.8v2.9h2.9v3.8h-2.9v2.9h-3.8v-2.9h-2.9v-3.8h2.9z"
        fill="#1E3A8A"
      />
    </svg>
  );
}
