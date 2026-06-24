'use client';

import { Switch, Group } from '@mantine/core';

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  onChange: (val: boolean) => void;
}

interface ColumnToggleProps {
  columns: ColumnDef[];
}

export default function ColumnToggle({ columns }: ColumnToggleProps) {
  return (
    <Group gap="md" wrap="wrap">
      {columns.map((col) => (
        <Switch
          key={col.key}
          label={col.label}
          size="xs"
          checked={col.visible}
          onChange={(e) => col.onChange(e.currentTarget.checked)}
        />
      ))}
    </Group>
  );
}
