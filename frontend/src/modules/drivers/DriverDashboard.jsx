import React, { useState } from 'react';
import {
  Box,
  Flex,
  SimpleGrid,
  Text,
  Button,
  HStack,
  VStack,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/card/Card';
import IconBox from '../../components/icons/IconBox';
import {
  MdMap,
  MdGpsFixed,
  MdPlace,
} from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import * as driversApi from '../../services/api/drivers';
import usePolling from '../../hooks/usePolling';

export default function DriverDashboard() {
  const textSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subtle = useColorModeValue('brand.50', 'navy.700');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');

  usePolling(async () => {
    try {
      const resp = await driversApi.list({ page: 1, pageSize: 1 });
      const driver = resp.items?.[0];
      if (!driver) {
        setData(null);
        setLoadError('');
        return;
      }
      setData(await driversApi.getDashboardStats(driver.id));
      setLoadError('');
    } catch (err) {
      console.error('Failed to refresh driver dashboard data', err);
      setLoadError('Dashboard data could not be refreshed. Please try again later.');
    }
  }, 30000, user?.role === 'driver');

  return (
    <Box pt={{ base: '20px', md: '10px' }} pb='40px'>
      {/* Header */}
      <Flex align='center' justify='space-between' mb='24px' wrap='wrap' gap={3}>
        <Box>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='800' color={textColor} letterSpacing='-0.5px'>
            Driver Transit Console
          </Text>
          <Text fontSize='sm' color={textSecondary}>
            Assigned route and vehicle information
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            size='sm'
            variant='brand'
            leftIcon={<Icon as={MdMap} />}
            onClick={() => navigate('/driver/live-tracking')}
          >
            Live Route Map
          </Button>
        </HStack>
      </Flex>

      {loadError && (
        <Alert status='error' mb='16px' borderRadius='md'>
          <AlertIcon />
          {loadError}
        </Alert>
      )}

      {/* Top KPIs */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing='16px' mb='24px'>
        <Card p='20px'>
          <Flex align='start' justify='space-between' flexWrap='wrap' columnGap={3} rowGap={2}>
            <HStack spacing={3} align='start'>
              <IconBox
                w='44px'
                h='44px'
                bg='linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)'
                icon={<Icon as={MdMap} w='22px' h='22px' color='white' />}
              />
              <Box>
                <Text fontWeight='700' fontSize='sm' color={textColor}>
                  Assigned Route
                </Text>
                <Text fontSize='xs' color={textSecondary} noOfLines={1} maxW={{ base: '140px', md: '180px' }}>
                  {data?.routeName || 'No route assigned'}
                </Text>
              </Box>
            </HStack>
            <Badge colorScheme='blue' borderRadius='6px' px='2'>
              {data?.stops ?? '—'} stops
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Route completion is unavailable without live stop tracking.
          </Text>
        </Card>

        <Card p='20px'>
          <Flex align='start' justify='space-between' flexWrap='wrap' columnGap={3} rowGap={2}>
            <HStack spacing={3} align='start'>
              <IconBox
                w='44px'
                h='44px'
                bg='linear-gradient(135deg, #10B981 0%, #34D399 100%)'
                icon={<Icon as={MdGpsFixed} w='22px' h='22px' color='white' />}
              />
              <Box>
                <Text fontWeight='700' fontSize='sm' color={textColor}>
                  Live Telemetry
                </Text>
                <Text fontSize='xs' color={textSecondary}>
                  Live GPS: Not configured
                </Text>
              </Box>
            </HStack>
            <Badge colorScheme='gray' borderRadius='6px' px='2'>
              No live telemetry
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            This system has no connected GPS or speed data source.
          </Text>
        </Card>

        <Card p='20px'>
          <Flex align='start' justify='space-between' flexWrap='wrap' columnGap={3} rowGap={2}>
            <HStack spacing={3} align='start'>
              <IconBox
                w='44px'
                h='44px'
                bg='linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
                icon={<Icon as={MdPlace} w='22px' h='22px' color='white' />}
              />
              <Box>
                <Text fontWeight='700' fontSize='sm' color={textColor}>
                  First Stop on Assigned Route
                </Text>
                <Text fontSize='xs' color={textSecondary} noOfLines={1} maxW={{ base: '140px', md: '180px' }}>
                  {data?.firstRouteStop || 'No route stop assigned'}
                </Text>
              </Box>
            </HStack>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Arrival time is unavailable without live tracking.
          </Text>
        </Card>

        <Card p='20px'>
          <Flex align='start' justify='space-between' flexWrap='wrap' columnGap={3} rowGap={2}>
            <HStack spacing={3} align='start'>
              <IconBox
                w='44px'
                h='44px'
                bg='linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)'
                icon={<Icon as={MdDirectionsBus} w='22px' h='22px' color='white' />}
              />
              <Box>
                <Text fontWeight='700' fontSize='sm' color={textColor}>
                  Assigned Vehicle
                </Text>
                <Text fontSize='xs' color={textSecondary}>
                  {data?.vehicleId || 'No vehicle assigned'}
                </Text>
              </Box>
            </HStack>
            <Badge variant='outline' borderRadius='6px' px='2'>
              {data?.capacity == null ? 'Capacity not recorded' : `${data.capacity} seats`}
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Inspection status is not available from the connected services.
          </Text>
        </Card>
      </SimpleGrid>

      {/* Map and Actions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing='20px'>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Route Navigation
          </Text>
          <Box
            h={{ base: '240px', md: '280px' }}
            borderRadius='14px'
            bg={subtle}
            borderWidth='1px'
            borderColor={useColorModeValue('brand.100', 'whiteAlpha.100')}
            display='flex'
            alignItems='center'
            justifyContent='center'
            flexDirection='column'
            gap={2}
          >
            <Icon as={MdMap} w='36px' h='36px' color='brand.500' />
            <Text fontSize='sm' fontWeight='600' color={textColor}>
              Live GPS tracking is not configured for this deployment.
            </Text>
            <Button size='sm' variant='outline' mt='2' onClick={() => navigate('/driver/live-tracking')}>
              View route details
            </Button>
          </Box>
        </Card>

        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Shift Operations
          </Text>
          <Box p='14px' bg={subtle} borderWidth='1px' borderColor={useColorModeValue('brand.100', 'whiteAlpha.100')} borderRadius='12px'>
            <Text fontSize='sm' color={textSecondary}>
              Shift scheduling and emergency reporting are not connected to backend services yet.
            </Text>
          </Box>
        </Card>
      </SimpleGrid>

    </Box>
  );
}
