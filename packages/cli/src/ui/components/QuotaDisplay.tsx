/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Text } from 'ink';
import { theme } from '../semantic-colors.js';

interface QuotaDisplayProps {
  remaining: number | undefined;
  limit: number | undefined;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  remaining,
  limit,
}) => {
  if (remaining === undefined || limit === undefined || limit === 0) {
    return null;
  }

  const percentage = (remaining / limit) * 100;

  let color = theme.status.success;
  if (percentage < 5) {
    color = theme.status.error;
  } else if (percentage < 20) {
    color = theme.status.warning;
  }

  return <Text color={color}>[Quota: {percentage.toFixed(0)}%]</Text>;
};
