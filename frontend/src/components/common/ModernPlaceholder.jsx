import React from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  useColorModeValue,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
} from '@chakra-ui/react';
import Card from '../card/Card';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdDashboard, MdOutlineEngineering, MdCheckCircleOutline } from 'react-icons/md';

export default function ModernPlaceholder({
  title = 'Module in Progress',
  subtitle = 'This specialized module is currently being tailored for high-speed automated campus workflows.',
  role = 'admin',
  badgeText = 'Automated Workflow',
}) {
  const navigate = useNavigate();
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const dashboardPath = `/${role}/dashboard`;

  return (
    <Box pt={{ base: '20px', md: '10px' }} pb='40px'>
      <Card p={{ base: '24px', md: '36px' }} mb='24px'>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'flex-start', md: 'center' }}
          justify='space-between'
          gap={4}
        >
          <Box>
            <HStack spacing={3} mb='2'>
              <Badge
                px='10px'
                py='4px'
                borderRadius='8px'
                bg={useColorModeValue('brand.50', 'rgba(37, 99, 235, 0.2)')}
                color={useColorModeValue('brand.700', 'brand.200')}
                fontSize='xs'
                fontWeight='700'
              >
                {badgeText}
              </Badge>
            </HStack>
            <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='800' color={textColor} letterSpacing='-0.5px'>
              {title}
            </Text>
            <Text fontSize='sm' color={textSecondary} maxW='600px' mt='2' lineHeight='1.6'>
              {subtitle}
            </Text>
          </Box>

          <HStack spacing={3} wrap='wrap'>
            <Button
              variant='outline'
              leftIcon={<Icon as={MdArrowBack} />}
              onClick={() => navigate(-1)}
              size='md'
            >
              Go Back
            </Button>
            <Button
              variant='brand'
              leftIcon={<Icon as={MdDashboard} />}
              onClick={() => navigate(dashboardPath)}
              size='md'
            >
              Dashboard
            </Button>
          </HStack>
        </Flex>
      </Card>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing='20px'>
        <Card p='24px'>
          <Flex align='center' gap={3} mb='3'>
            <Flex
              w='36px'
              h='36px'
              borderRadius='10px'
              bg={useColorModeValue('brand.50', 'whiteAlpha.100')}
              align='center'
              justify='center'
            >
              <Icon as={MdCheckCircleOutline} color='brand.500' w='20px' h='20px' />
            </Flex>
            <Text fontSize='md' fontWeight='700' color={textColor}>
              Automated Operations
            </Text>
          </Flex>
          <Text fontSize='sm' color={textSecondary} lineHeight='1.6'>
            Features automated record synchronization, multi-campus filtering, and audit tracking.
          </Text>
        </Card>

        <Card p='24px'>
          <Flex align='center' gap={3} mb='3'>
            <Flex
              w='36px'
              h='36px'
              borderRadius='10px'
              bg={useColorModeValue('accent.50', 'whiteAlpha.100')}
              align='center'
              justify='center'
            >
              <Icon as={MdOutlineEngineering} color='accent.500' w='20px' h='20px' />
            </Flex>
            <Text fontSize='md' fontWeight='700' color={textColor}>
              Fast & Responsive
            </Text>
          </Flex>
          <Text fontSize='sm' color={textSecondary} lineHeight='1.6'>
            Fully responsive design tailored for seamless operation on mobile, tablet, and desktop viewports.
          </Text>
        </Card>

        <Card p='24px'>
          <Flex align='center' gap={3} mb='3'>
            <Flex
              w='36px'
              h='36px'
              borderRadius='10px'
              bg={useColorModeValue('teal.50', 'whiteAlpha.100')}
              align='center'
              justify='center'
            >
              <Icon as={MdDashboard} color='teal.500' w='20px' h='20px' />
            </Flex>
            <Text fontSize='md' fontWeight='700' color={textColor}>
              Role-Based Control
            </Text>
          </Flex>
          <Text fontSize='sm' color={textSecondary} lineHeight='1.6'>
            Protected through granular permissions so each user sees only their authorized records.
          </Text>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
