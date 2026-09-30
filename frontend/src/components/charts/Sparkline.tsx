import React, { useMemo } from 'react';
import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export type SparklineProps = {
  data: number[];
  height?: number;
  color?: string;
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
  type?: 'area' | 'line';
};

export default function Sparkline({ data, height = 40, color, ariaLabel, valueFormatter, type = 'area' }: SparklineProps) {
  const defaultStrokeColor = useColorModeValue('#4f46e5', '#a5b4fc');
  const strokeColor = color || defaultStrokeColor;

  const series = useMemo(() => [{ name: 'trend', data: Array.isArray(data) ? data : [] }], [data]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type,
        sparkline: { enabled: true },
        toolbar: { show: false },
        animations: { enabled: false },
        zoom: { enabled: false },
      },
      stroke: { curve: 'smooth', width: type === 'line' ? 2 : 3 },
      markers: { size: 0, hover: { size: 4 } },
      fill: type === 'area'
        ? {
            type: 'gradient',
            gradient: { shadeIntensity: 0.35, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
          }
        : { opacity: 0 },
      colors: [strokeColor],
      dataLabels: { enabled: false },
      grid: { show: false },
      xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { labels: { show: false } },
      tooltip: {
        enabled: true,
        x: { show: false },
        y: {
          formatter: (v) => (typeof valueFormatter === 'function' ? valueFormatter(Number(v)) : `${v}`),
        },
      },
    }),
    [strokeColor, type, valueFormatter]
  );

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Box aria-label={ariaLabel || 'Sparkline'}>
        <Text fontSize="xs">No trend data.</Text>
        <noscript>Trend chart unavailable without JavaScript.</noscript>
      </Box>
    );
  }

  return (
    <Box aria-label={ariaLabel || 'Sparkline'} role="img">
      <ReactApexChart options={options as any} series={series as any} type={type} height={height} width="100%" />
      <noscript>Trend chart unavailable without JavaScript.</noscript>
    </Box>
  );
}
