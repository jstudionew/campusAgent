import React from 'react';
import { Badge, Box, Flex, HStack, Icon, Text, useColorModeValue } from '@chakra-ui/react';
import Sparkline from './charts/v2/Sparkline';

export type StatsCardProps = {
  title: string;
  subtitle?: string;
  value: string | number;
  delta?: string;
  icon?: React.ElementType;
  sparkline?: number[];
  ariaLabel?: string;
};

export default function StatsCard({ title, subtitle, value, delta, icon, sparkline, ariaLabel }: StatsCardProps) {
  const bg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('rgba(219, 234, 254, 0.8)', 'whiteAlpha.100');
  const shadow = useColorModeValue('0 4px 20px rgba(37, 99, 235, 0.05)', '0 8px 24px rgba(0, 0, 0, 0.45)');
  const isNegative = delta && delta.trim().startsWith('-');
  const deltaBg = useColorModeValue(isNegative ? 'red.50' : 'green.50', isNegative ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)');
  const deltaColor = useColorModeValue(isNegative ? 'red.600' : 'green.600', isNegative ? 'red.200' : 'green.200');

  return (
    <Box
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="16px"
      boxShadow={shadow}
      px={5}
      py={4}
      transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(37, 99, 235, 0.1)' }}
    >
      <Flex align="start" justify="space-between" gap={3}>
        <Box minW={0}>
          <HStack spacing={2} mb={1}>
            {icon ? (
              <Flex
                w="36px"
                h="36px"
                align="center"
                justify="center"
                borderRadius="10px"
                bg={useColorModeValue('brand.50', 'whiteAlpha.100')}
              >
                <Icon as={icon} color={useColorModeValue('brand.600', 'brand.300')} w="18px" h="18px" />
              </Flex>
            ) : null}
            <Text fontSize="sm" fontWeight={700} color={useColorModeValue('secondaryGray.700', 'secondaryGray.200')} isTruncated>
              {title}
            </Text>
          </HStack>
          {subtitle ? (
            <Text fontSize="xs" color={useColorModeValue('secondaryGray.500', 'secondaryGray.400')} noOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          <Text fontSize="2xl" fontWeight={800} color={useColorModeValue('secondaryGray.900', 'white')} mt={2}>
            {value}
          </Text>
          {delta ? (
            <Badge mt={2} bg={deltaBg} color={deltaColor} borderRadius="full" px={2.5} py={0.5} fontSize="xs" fontWeight="700">
              {delta}
            </Badge>
          ) : null}
        </Box>

        <Box w="96px" h="44px" aria-label={ariaLabel || `${title} trend`}>
          <Sparkline ariaLabel={ariaLabel || `${title} trend`} data={sparkline || [2, 3, 3, 4, 4, 5]} height={44} />
          <noscript>
            <Text fontSize="xs">Trend chart unavailable without JavaScript.</Text>
          </noscript>
        </Box>
      </Flex>
    </Box>
  );
}
