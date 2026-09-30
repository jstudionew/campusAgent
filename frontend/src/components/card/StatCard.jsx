import React from 'react';
import {
  Box,
  Flex,
  VStack,
  Text,
  Icon,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';

const StatCard = ({ title, value, subValue, note, icon, trend, trendValue, colorScheme = 'blue', valueFontSize = '2xl' }) => {
  // Professional Palette with high-contrast harmony
  const colors = {
    blue: { bg: '#EEF4FF', text: '#1E40AF', iconBg: '#FFFFFF', border: '#BFDBFE' },
    amber: { bg: '#FFFBEB', text: '#B45309', iconBg: '#FFFFFF', border: '#FDE68A' },
    orange: { bg: '#FFF7ED', text: '#C2410C', iconBg: '#FFFFFF', border: '#FED7AA' },
    green: { bg: '#ECFDF5', text: '#047857', iconBg: '#FFFFFF', border: '#A7F3D0' },
    red: { bg: '#FFF1F2', text: '#BE123C', iconBg: '#FFFFFF', border: '#FECDD3' },
    teal: { bg: '#F0FDFA', text: '#0F766E', iconBg: '#FFFFFF', border: '#99F6E4' },
    cyan: { bg: '#ECFEFF', text: '#0E7490', iconBg: '#FFFFFF', border: '#A5F3FC' },
    purple: { bg: '#F5F3FF', text: '#6D28D9', iconBg: '#FFFFFF', border: '#DDD6FE' },
  };

  const theme = colors[colorScheme] || colors.blue;
  const bg = useColorModeValue(theme.bg, 'navy.800');
  const color = useColorModeValue(theme.text, 'white');
  const iconBg = useColorModeValue(theme.iconBg, 'whiteAlpha.100');
  const borderColor = useColorModeValue(theme.border, 'whiteAlpha.200');
  const cardShadow = useColorModeValue('0 4px 20px rgba(37, 99, 235, 0.05)', '0 8px 24px rgba(0, 0, 0, 0.4)');
  const cardHoverShadow = useColorModeValue('0 10px 25px rgba(37, 99, 235, 0.12)', '0 12px 30px rgba(0, 0, 0, 0.6)');
  const iconBorderColor = useColorModeValue('rgba(255,255,255,0.8)', 'whiteAlpha.100');
  const iconColor = useColorModeValue(theme.text, 'brand.300');
  const trendUpBg = useColorModeValue('green.100', 'rgba(16, 185, 129, 0.2)');
  const trendDownBg = useColorModeValue('red.100', 'rgba(244, 63, 94, 0.2)');
  const trendUpColor = useColorModeValue('green.800', 'green.200');
  const trendDownColor = useColorModeValue('red.800', 'red.200');
  const secondaryTextColor = useColorModeValue(theme.text, 'secondaryGray.400');
  const noteTextColor = useColorModeValue(theme.text, 'secondaryGray.500');

  return (
    <Box
      bg={bg}
      p='22px'
      borderRadius='16px'
      border='1px solid'
      borderColor={borderColor}
      position='relative'
      overflow='hidden'
      boxShadow={cardShadow}
      transition='all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      _hover={{
        transform: 'translateY(-3px)',
        boxShadow: cardHoverShadow
      }}
    >
      <Flex justify='space-between' align='start' mb='10px'>
        <Flex
          align='center'
          justify='center'
          w='46px'
          h='46px'
          borderRadius='12px'
          bg={iconBg}
          boxShadow="sm"
          border='1px solid'
          borderColor={iconBorderColor}
        >
          <Icon as={icon} w='22px' h='22px' color={iconColor} />
        </Flex>
        {trend && (
          <Badge
            bg={trend === 'up' ? trendUpBg : trendDownBg}
            color={trend === 'up' ? trendUpColor : trendDownColor}
            borderRadius='full'
            px='2.5'
            py='0.5'
            fontSize='xs'
            fontWeight='700'
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}%
          </Badge>
        )}
      </Flex>

      <VStack align='start' spacing='3px' mt='6px'>
        <Text
          color={secondaryTextColor}
          fontSize='xs'
          fontWeight='700'
          textTransform="uppercase"
          letterSpacing="0.8px"
        >
          {title}
        </Text>
        <Text color={color} fontSize={valueFontSize} fontWeight='800' letterSpacing="-0.5px">
          {value}
        </Text>
        {subValue && (
          <Text color={secondaryTextColor} fontSize='xs' fontWeight='600' opacity={0.8}>
            {subValue}
          </Text>
        )}
        {note && (
          <Text color={noteTextColor} fontSize='xs' fontWeight='500' opacity={0.7} mt='1px'>
            {note}
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default StatCard;
