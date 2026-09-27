import React, { useMemo, useState, useEffect } from 'react';
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
  useColorModeValue,
  Wrap,
  WrapItem,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useToast,
  Select,
  Input,
  Textarea,
  Divider,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/card/Card';
import IconBox from '../../components/icons/IconBox';
import {
  MdMap,
  MdGpsFixed,
  MdPlace,
  MdDirectionsBus,
  MdAccessTime,
  MdReportProblem,
  MdPlayArrow,
  MdStop,
} from 'react-icons/md';
import SparklineChart from '../../components/charts/SparklineChart';
import PieChart from '../../components/charts/PieChart';
import { useAuth } from '../../contexts/AuthContext';
import * as driversApi from '../../services/api/drivers';

export default function DriverDashboard() {
  const textSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subtle = useColorModeValue('brand.50', 'navy.700');
  const toast = useToast();
  const sosDisc = useDisclosure();
  const incidentDisc = useDisclosure();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState({
    routeName: 'Route 12 - North Campus to Central',
    stops: 14,
    progress: 45,
    gpsStatus: 'Active',
    nextStop: 'Oak Street & 5th Ave',
    eta: '8 mins',
    vehicleId: 'BUS-104',
    capacity: '32/40 Seats',
    shift: { start: '07:30 AM', end: '03:30 PM' },
    lastUpdate: 'Just now',
    speed: '42 km/h',
    speedTrend: [25, 30, 42, 38, 45, 42, 40, 48, 42, 35, 40, 42],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'driver') {
          const resp = await driversApi.list({});
          const items = resp.items || [];
          if (items.length > 0) {
            const me = items[0];
            const stats = await driversApi.getDashboardStats(me.id);
            if (stats) setData(stats);
          }
        }
      } catch (err) {
        console.error('Failed to fetch driver stats', err);
      }
    };
    if (user?.role === 'driver') {
      fetchStats();
    }
  }, [user]);

  const [shiftOn, setShiftOn] = useState(true);
  const [shiftSince, setShiftSince] = useState('07:30 AM');
  const [sosType, setSosType] = useState('accident');
  const [incidentType, setIncidentType] = useState('delay');
  const [incidentNote, setIncidentNote] = useState('');
  const completedStops = useMemo(() => Math.round((data.progress / 100) * data.stops), [data.progress, data.stops]);
  const remainingStops = useMemo(() => Math.max(0, data.stops - completedStops), [data.stops, completedStops]);

  return (
    <Box pt={{ base: '20px', md: '10px' }} pb='40px'>
      {/* Header */}
      <Flex align='center' justify='space-between' mb='24px' wrap='wrap' gap={3}>
        <Box>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='800' color={textColor} letterSpacing='-0.5px'>
            Driver Transit Console
          </Text>
          <Text fontSize='sm' color={textSecondary}>
            Active vehicle telemetry, scheduled route, student passenger pickup
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            size='sm'
            variant='outline'
            leftIcon={<Icon as={MdDirectionsBus} />}
            onClick={() => navigate('/driver/pickup-drop')}
          >
            Student Manifest
          </Button>
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
                  {data.routeName}
                </Text>
              </Box>
            </HStack>
            <Badge colorScheme='blue' borderRadius='6px' px='2'>
              {data.stops} stops
            </Badge>
          </Flex>
          <Box mt='14px' h='8px' bg={useColorModeValue('secondaryGray.200', 'whiteAlpha.100')} borderRadius='full'>
            <Box h='100%' w={`${data.progress}%`} bg='brand.500' borderRadius='full' />
          </Box>
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
                  GPS: {data.gpsStatus}
                </Text>
              </Box>
            </HStack>
            <Badge colorScheme='green' borderRadius='6px' px='2'>
              {data.speed}
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Updated {data.lastUpdate}
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
                  Next Pickup
                </Text>
                <Text fontSize='xs' color={textSecondary} noOfLines={1} maxW={{ base: '140px', md: '180px' }}>
                  {data.nextStop}
                </Text>
              </Box>
            </HStack>
            <Badge colorScheme='orange' borderRadius='6px' px='2'>
              ETA {data.eta}
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Stop #{completedStops + 1} of {data.stops}
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
                  Vehicle Identity
                </Text>
                <Text fontSize='xs' color={textSecondary}>
                  {data.vehicleId}
                </Text>
              </Box>
            </HStack>
            <Badge variant='outline' borderRadius='6px' px='2'>
              {data.capacity}
            </Badge>
          </Flex>
          <Text fontSize='xs' color={textSecondary} mt='14px'>
            Pre-trip inspection verified
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
              Active Transit GPS Tracking
            </Text>
            <Button
              size='sm'
              variant='brand'
              mt='2'
              onClick={() => navigate('/driver/live-tracking')}
            >
              Open Fullscreen Navigation
            </Button>
          </Box>
        </Card>

        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Shift Operations & Emergency
          </Text>
          <HStack spacing={3} mb='16px' flexWrap='wrap'>
            <Badge colorScheme='green' borderRadius='6px' px='2.5' py='1'>
              Start {data.shift.start}
            </Badge>
            <Badge colorScheme='red' borderRadius='6px' px='2.5' py='1'>
              End {data.shift.end}
            </Badge>
            {shiftOn ? (
              <Badge colorScheme='blue' borderRadius='6px' px='2.5' py='1'>
                Active on duty • {shiftSince}
              </Badge>
            ) : (
              <Badge colorScheme='gray' borderRadius='6px' px='2.5' py='1'>
                Off Duty
              </Badge>
            )}
          </HStack>

          <Wrap spacing='10px' mb='16px'>
            <WrapItem>
              <Tooltip label='Start duty and activate student tracking'>
                <Button
                  size='sm'
                  leftIcon={<Icon as={MdPlayArrow} />}
                  colorScheme='green'
                  onClick={() => {
                    setShiftOn(true);
                    setShiftSince(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    toast({ status: 'success', title: 'Shift active', description: 'GPS tracking is broadcasting' });
                  }}
                >
                  Start Shift
                </Button>
              </Tooltip>
            </WrapItem>
            <WrapItem>
              <Tooltip label='End active duty'>
                <Button
                  size='sm'
                  leftIcon={<Icon as={MdStop} />}
                  colorScheme='red'
                  variant='outline'
                  onClick={() => {
                    if (!shiftOn) {
                      toast({ status: 'info', title: 'Shift is not active' });
                      return;
                    }
                    setShiftOn(false);
                    toast({ status: 'success', title: 'Shift ended successfully' });
                  }}
                >
                  End Shift
                </Button>
              </Tooltip>
            </WrapItem>
            <WrapItem>
              <Tooltip label='Instant emergency signal to control room'>
                <Button
                  size='sm'
                  leftIcon={<Icon as={MdReportProblem} />}
                  colorScheme='orange'
                  onClick={sosDisc.onOpen}
                >
                  Emergency SOS
                </Button>
              </Tooltip>
            </WrapItem>
            <WrapItem>
              <Tooltip label='Report delays, traffic, or vehicle issue'>
                <Button
                  size='sm'
                  leftIcon={<Icon as={MdReportProblem} />}
                  variant='outline'
                  onClick={incidentDisc.onOpen}
                >
                  Report Incident
                </Button>
              </Tooltip>
            </WrapItem>
          </Wrap>

          <Box p='14px' bg={subtle} borderWidth='1px' borderColor={useColorModeValue('brand.100', 'whiteAlpha.100')} borderRadius='12px'>
            <Flex justify='space-between' align='center' mb='8px'>
              <Text fontSize='xs' fontWeight='700' textTransform='uppercase' color={textSecondary}>
                Route Completion
              </Text>
              <Text fontSize='xs' fontWeight='800' color='brand.500'>
                {completedStops} of {data.stops} Stops
              </Text>
            </Flex>
            <Box h='8px' bg={useColorModeValue('secondaryGray.200', 'whiteAlpha.200')} borderRadius='full'>
              <Box h='100%' w={`${data.progress}%`} bg='brand.500' borderRadius='full' />
            </Box>
          </Box>
        </Card>
      </SimpleGrid>

      {/* Mini analytics */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing='20px' mt='20px'>
        <Card p='20px'>
          <HStack justify='space-between' align='start' mb='12px'>
            <VStack align='start' spacing={0}>
              <Text fontSize='md' fontWeight='800' color={textColor}>
                Speed Trend Telemetry
              </Text>
              <Text fontSize='xs' color={textSecondary}>
                Real-time safety monitor (speed limit: 50 km/h)
              </Text>
            </VStack>
            <Badge colorScheme='blue' borderRadius='6px' px='2.5' py='1'>
              {data.speed}
            </Badge>
          </HStack>
          <Box mt='8px'>
            <SparklineChart data={data.speedTrend} color='#2563EB' height={70} valueFormatter={(v) => `${v} km/h`} />
          </Box>
        </Card>

        <Card p='20px'>
          <Text fontSize='md' fontWeight='800' color={textColor} mb='12px'>
            Stop Progress Breakdown
          </Text>
          <PieChart
            chartData={[completedStops, remainingStops]}
            chartOptions={{
              labels: ['Completed', 'Remaining'],
              colors: ['#10B981', '#94A3B8'],
              legend: { show: true, position: 'right' },
            }}
          />
        </Card>
      </SimpleGrid>

      {/* SOS Modal */}
      <Modal isOpen={sosDisc.isOpen} onClose={sosDisc.onClose} isCentered>
        <ModalOverlay backdropFilter='blur(4px)' />
        <ModalContent borderRadius='16px'>
          <ModalHeader color='red.500' fontWeight='800'>
            Broadcast Emergency SOS
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align='stretch' spacing={3}>
              <Text fontSize='sm' color={textSecondary}>
                Select emergency category. Your real-time GPS coordinates will be instantly dispatched to school administration and campus security.
              </Text>
              <Select value={sosType} onChange={(e) => setSosType(e.target.value)} borderRadius='10px'>
                <option value='accident'>Vehicle Accident</option>
                <option value='medical'>Student Medical Emergency</option>
                <option value='security'>Security / Disturbance Threat</option>
                <option value='vehicle'>Engine Breakdown / Flat Tire</option>
              </Select>
              <Input placeholder='Specific Landmark / Location details (optional)' borderRadius='10px' />
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant='outline' onClick={sosDisc.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme='red'
              onClick={() => {
                sosDisc.onClose();
                toast({ status: 'warning', title: `SOS Dispatched (${sosType.toUpperCase()})`, description: 'Campus security has been alerted.' });
              }}
            >
              Broadcast SOS
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Incident Modal */}
      <Modal isOpen={incidentDisc.isOpen} onClose={incidentDisc.onClose} isCentered>
        <ModalOverlay backdropFilter='blur(4px)' />
        <ModalContent borderRadius='16px'>
          <ModalHeader fontWeight='800'>Report Route Incident</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align='stretch' spacing={3}>
              <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} borderRadius='10px'>
                <option value='delay'>Traffic Jam / Road Delay</option>
                <option value='behavior'>Student Discipline Incident</option>
                <option value='traffic'>Road Blockage / Detour</option>
                <option value='vehicle'>Minor Vehicle Maintenance</option>
              </Select>
              <Textarea
                placeholder='Detail the event and affected stops...'
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                borderRadius='10px'
              />
              <Input type='file' accept='image/*' borderRadius='10px' pt='4px' />
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant='outline' onClick={incidentDisc.onClose}>
              Cancel
            </Button>
            <Button
              variant='brand'
              onClick={() => {
                incidentDisc.onClose();
                toast({ status: 'success', title: 'Incident logged', description: 'Admin transit report updated.' });
                setIncidentNote('');
              }}
            >
              Submit Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
