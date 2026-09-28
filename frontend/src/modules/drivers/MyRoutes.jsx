import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, HStack, Input, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import { MdFileDownload } from 'react-icons/md';
import Card from '../../components/card/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as driversApi from '../../services/api/drivers';
import usePolling from '../../hooks/usePolling';

export default function MyRoutes() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('white', 'gray.800');
  const { user } = useAuth();
  const [route, setRoute] = useState();
  const [search, setSearch] = useState('');

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
      console.error('Failed to refresh driver route assignments', error);
    }
  }, 30000, user?.role === 'driver');

  const stops = useMemo(() => {
    const items = route?.routeStops || [];
    const normalizedSearch = search.trim().toLowerCase();
    return normalizedSearch
      ? items.filter((stop) => stop.name.toLowerCase().includes(normalizedSearch))
      : items;
  }, [route, search]);

  const exportCSV = () => {
    const rows = [
      ['Sequence', 'Stop'],
      ...stops.map((stop) => [stop.sequence, stop.name]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assigned_route_stops.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>My Route</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>
        Your assigned route and configured stops. Route data refreshes automatically.
      </Text>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing='16px' mb='16px'>
        <Card p='20px'>
          <Text fontSize='sm' color={textSecondary}>Assigned Route</Text>
          <Text fontSize='lg' fontWeight='bold'>{route === undefined ? 'Loading…' : route?.routeName || 'No route assigned'}</Text>
        </Card>
        <Card p='20px'>
          <Text fontSize='sm' color={textSecondary}>Assigned Vehicle</Text>
          <Text fontSize='lg' fontWeight='bold'>{route === undefined ? 'Loading…' : route?.vehicleId || 'No vehicle assigned'}</Text>
        </Card>
        <Card p='20px'>
          <Text fontSize='sm' color={textSecondary}>Configured Stops</Text>
          <Text fontSize='lg' fontWeight='bold'>{route === undefined ? '—' : String(route?.stops ?? 0)}</Text>
        </Card>
      </SimpleGrid>

      <Card p='16px'>
        <HStack justify='space-between' flexWrap='wrap' mb='12px'>
          <Input
            aria-label='Search assigned stops'
            placeholder='Search assigned stops'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxW='320px'
          />
          <Button
            size='sm'
            leftIcon={<MdFileDownload />}
            onClick={exportCSV}
            isDisabled={!stops.length}
          >
            Export Stops
          </Button>
        </HStack>
        <Box overflowX='auto'>
          <Table size='sm' variant='striped' colorScheme='gray'>
            <Thead bg={headerBg}>
              <Tr><Th>Sequence</Th><Th>Stop</Th><Th>Tracking Status</Th></Tr>
            </Thead>
            <Tbody>
              {stops.map((stop) => (
                <Tr key={stop.id}>
                  <Td>{stop.sequence}</Td>
                  <Td>{stop.name}</Td>
                  <Td><Badge colorScheme='gray'>Unavailable</Badge></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {route !== undefined && !stops.length && (
            <Text color={textSecondary} fontSize='sm' p='4'>
              {route?.routeStops?.length ? 'No route stops match your search.' : 'No stops are configured for your assigned route.'}
            </Text>
          )}
          {route === undefined && (
            <Text color={textSecondary} fontSize='sm' p='4'>Loading assigned route…</Text>
          )}
        </Box>
      </Card>
    </Box>
  );
}
