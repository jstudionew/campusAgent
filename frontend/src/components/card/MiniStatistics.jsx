import {
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
  Text,
  Box,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import Sparkline from "components/charts/Sparkline.tsx";
import React from "react";

export default function Default(props) {
  const {
    startContent,
    endContent,
    name,
    growth,
    value,
    trendData,
    trendColor,
    trendFormatter,
    compact,
  } = props;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.500", "secondaryGray.400");
  const hoverShadow = useColorModeValue(
    "0 12px 30px rgba(37, 99, 235, 0.12)",
    "0 14px 35px rgba(0, 0, 0, 0.65)"
  );

  const isNegativeGrowth = typeof growth === 'string' && growth.trim().startsWith('-');

  return (
    <Card
      py={compact ? { base: '12px', md: '14px' } : '18px'}
      cursor='pointer'
      transition='all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      _hover={{ boxShadow: hoverShadow, transform: "translateY(-3px)" }}
      _active={{ transform: "translateY(0px)" }}
    >
      <Flex
        my='auto'
        w='100%'
        align='center'
        justify='space-between'
        gap={compact ? 3 : 4}
        flexWrap='wrap'
        rowGap={2}
      >
        <Flex align='center' gap={compact ? 3 : 4} minW='0'>
          {startContent}

          <Stat my='auto' ms={startContent ? "4px" : "0px"} minW='0'>
            <StatLabel
              lineHeight='120%'
              color={textColorSecondary}
              fontWeight='600'
              fontSize={{
                base: "xs",
                md: "sm",
              }}
              noOfLines={1}
            >
              {name}
            </StatLabel>
            <StatNumber
              color={textColor}
              fontWeight='700'
              fontSize={{
                base: "xl",
                md: "2xl",
                lg: "3xl",
              }}
            >
              {value}
            </StatNumber>
          </Stat>
        </Flex>

        {growth ? (
          <Flex
            align='flex-end'
            direction='column'
            ms='auto'
            minW='max-content'
          >
            <Text
              color={isNegativeGrowth ? 'red.500' : 'green.500'}
              fontSize='sm'
              fontWeight='700'
            >
              {growth}
            </Text>
            <Text color={textColorSecondary} fontSize='xs' fontWeight='500' display={{ base: 'none', md: 'block' }}>
              since last month
            </Text>
          </Flex>
        ) : (
          <Flex ms='auto' display={{ base: 'none', md: 'flex' }}>{endContent}</Flex>
        )}
      </Flex>

      {trendData && trendData.length > 0 && (
        <Box w='100%' h={compact ? '36px' : '48px'} mt={compact ? 3 : 4}>
          <Sparkline
            ariaLabel={`${name || 'Metric'} trend`}
            data={trendData}
            color={trendColor || "#2563EB"}
            height={compact ? 36 : 48}
            type="line"
            valueFormatter={trendFormatter}
          />
        </Box>
      )}
    </Card>
  );
}
