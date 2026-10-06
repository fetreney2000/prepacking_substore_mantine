import {
  ActionIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

/**
 * Manual light/dark switch at the far right of the app header.
 *
 * The provider still starts on `defaultColorScheme="auto"` (follow the OS);
 * this button stores an explicit choice. Mantine persists it through its
 * localStorage scheme manager — the same key `ColorSchemeScript` reads before
 * first paint — so a chosen scheme is applied on the next load with no flash.
 *
 * The icon and label describe the scheme the click switches *to*, so what the
 * button says is what the next click does. `getInitialValueInEffect: false`
 * keeps the server's markup (light) stable: the icon flips in an effect after
 * hydration instead of mismatching when the OS is dark.
 */
export default function ColorSchemeToggle() {
  const { toggleColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme('light', { getInitialValueInEffect: false });

  const switchingToLight = scheme === 'dark';
  const label = switchingToLight ? 'Tukar ke mod cerah' : 'Tukar ke mod gelap';

  return (
    <Tooltip label={label} position="bottom" withArrow>
      <ActionIcon
        variant="subtle"
        aria-label={label}
        onClick={() => toggleColorScheme()}
        style={{ color: 'white' }}
      >
        {switchingToLight ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
