'use client';

import { useState } from 'react';
import { Box, Button, Group, Popover, Stack, Switch } from '@mantine/core';
import { IconColumns } from '@tabler/icons-react';

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  onChange: (val: boolean) => void;
}

interface ColumnToggleProps {
  columns: ColumnDef[];
  /** Label on the compact phone-only button; defaults to "Paparan Kolum". */
  label?: string;
}

/**
 * Column-visibility switches that sit above every table.
 *
 * From `sm` up the switches stay inline — nothing to open, nothing to
 * dismiss, and the bar is wide enough for them. Below `sm` the same set (ten
 * switches on the item list) would stack into three or four rows and eat a
 * quarter of a phone screen above the table, so it collapses into a single
 * button that opens a popover.
 *
 * The switch is `md`, not the old `xs`: the `xs` track is 16px tall, under
 * the 24px minimum target of WCAG 2.5.8 (AA).
 */
export default function ColumnToggle({ columns, label = 'Paparan Kolum' }: ColumnToggleProps) {
  const [opened, setOpened] = useState(false);

  const switches = columns.map((col) => (
    <Switch
      key={col.key}
      label={col.label}
      size="md"
      checked={col.visible}
      onChange={(e) => col.onChange(e.currentTarget.checked)}
    />
  ));

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <>
      <Group gap="md" wrap="wrap" visibleFrom="sm">
        {switches}
      </Group>

      <Box hiddenFrom="sm">
        <Popover
          opened={opened}
          onChange={setOpened}
          position="bottom-start"
          shadow="md"
          withinPortal
        >
          <Popover.Target>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconColumns size={16} />}
              onClick={() => setOpened((o) => !o)}
              aria-expanded={opened}
            >
              {label} ({visibleCount}/{columns.length})
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">{switches}</Stack>
          </Popover.Dropdown>
        </Popover>
      </Box>
    </>
  );
}
