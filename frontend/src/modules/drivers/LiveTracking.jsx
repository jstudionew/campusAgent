import React, { useState } from 'react';
import { Badge, Box, HStack, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import Card from '../../components/card/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as driversApi from '../../services/api/drivers';
import usePolling from '../../hooks/usePolling';

export default function LiveTracking() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('white', 'gray.800');
  const { user } = useAuth();
  const [route, setRoute] = useState();

  usePolling(async () => {
    try {
      const response = await driversApi.list({ page: 1, pageSize: 1 });
      const driver = response.items?.[0];
      if (!driver) {
        setRoute(null);
        return;
      }
      setRoute(await driversApi.getDashboardStats(driver.id));
    } catch (error) {
      console.error('Failed to refresh assigned route details', error);
    }
  }, 30000, user?.role === 'driver');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Assigned Route</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>
        Route assignments and stops refresh automatically. Live vehicle telemetry is not connected.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing='16px' mb='16px'>
        <Card p='20px'>
          <Text fontSize='sm' color={textSecondary}>Route</Text>
          <Text fontSize='lg' fontWeight='bold'>{route === undefined ? 'Loading…' : route?.routeName || 'No route assigned'}</Text>
        </Card>
        <Card p='20px'>
          <Text fontSize='sm' color={textSecondary}>Assigned Vehicle</Text>
          <Text fontSize='lg' fontWeight='bold'>{route === undefined ? 'Loading…' : route?.vehicleId || 'No vehicle assigned'}</Text>
        </Card>
      </SimpleGrid>

      <Card p='20px' mb='16px'>
        <HStack justify='space-between' align='center' mb='12px'>
          <Text fontSize='lg' fontWeight='bold'>Live Vehicle Telemetry</Text>
          <Badge colorScheme='gray'>Not configured</Badge>
        </HStack>
        <Text color={textSecondary}>
          No GPS provider is connected, so position, speed, ETA, and route completion cannot be reported.
        </Text>
      </Card>

      <Card p='0'>
        <Box overflowX='auto'>
          <Table size='sm' variant='striped' colorScheme='gray'>
            <Thead bg={headerBg}>
              <Tr><Th>Sequence</Th><Th>Stop</Th></Tr>
            </Thead>
            <Tbody>
              {(route?.routeStops || []).map((stop) => (
                <Tr key={stop.id}>
                  <Td>{stop.sequence}</Td>
                  <Td>{stop.name}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {route !== undefined && !route?.routeStops?.length && (
            <Text color={textSecondary} fontSize='sm' p='4'>
              {route?.routeName ? 'No stops are configured for this route.' : 'Assign a route to this driver to see its stops.'}
            </Text>
          )}
          {route === undefined && (
            <Text color={textSecondary} fontSize='sm' p='4'>Loading assigned route stops…</Text>
          )}
        </Box>
      </Card>
    </Box>
  );
}
