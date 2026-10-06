import { useEffect } from 'react';

/**
 * Press `/` anywhere on the page to jump into its search field (review #9).
 *
 * The list pages are driven by their search boxes, so the accelerator has to
 * exist before the help page may document it — documented shortcuts that do
 * nothing are worse than none.
 *
 * Rules:
 * - Typing `/` inside an input, textarea, select or contenteditable must keep
 *   typing the character, so those targets are ignored (the effect also stays
 *   quiet while a modifier is held, so browser chords such as Ctrl+/ are
 *   untouched).
 * - `preventDefault()` keeps Firefox's quick-find from stealing the key.
 * - The field's existing text is selected, so the next keystroke replaces the
 *   previous query instead of appending to it.
 * - Pages opt in by marking their search input with `data-search-input`;
 *   `document.querySelector` finds the first such field, and pages without one
 *   simply have nothing to focus.
 */
export function useSlashToFocus(selector = '[data-search-input]'): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }

      const field = document.querySelector<HTMLInputElement>(selector);
      if (!field) return;

      e.preventDefault();
      field.focus();
      field.select();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selector]);
}
