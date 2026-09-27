import React, { useMemo } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export type RadialAttendanceProps = {
  value: number;
  height?: number;
  label?: string;
  subtitle?: string;
  ariaLabel?: string;
};

export default function RadialAttendance({ value, height = 220, label, subtitle, ariaLabel }: RadialAttendanceProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const track = useColorModeValue('#E2E8F0', '#2D3748');
  const primary = useColorModeValue('#14b8a6', '#81e6d9');
  const labelColor = useColorModeValue('#334155', '#CBD5E1');

  const series = useMemo(() => [v], [v]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'radialBar', toolbar: { show: false }, animations: { enabled: false } },
      plotOptions: {
        radialBar: {
          hollow: { size: '62%' },
          track: { background: track },
          dataLabels: {
            name: { show: true, offsetY: 18, color: labelColor },
            value: { show: true, fontSize: '28px', fontWeight: 800, offsetY: -10, color: labelColor },
          },
        },
      },
      colors: [primary],
      labels: [label || 'Attendance'],
    }),
    [label, labelColor, primary, track]
  );

  return (
    <Box aria-label={ariaLabel || 'Radial'} role="img">
      <ReactApexChart options={options as any} series={series as any} type="radialBar" height={height} width="100%" />
      {subtitle ? (
        <Text fontSize="xs" color={useColorModeValue('gray.600', 'gray.400')} mt={2}>
          {subtitle}
        </Text>
      ) : null}
      <noscript>Chart unavailable without JavaScript.</noscript>
    </Box>
  );
}
