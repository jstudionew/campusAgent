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
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/card/Card';
import MiniStatistics from '../../components/card/MiniStatistics';
import IconBox from '../../components/icons/IconBox';
import {
  MdClass,
  MdCheckCircle,
  MdAssignment,
  MdOutlineEvent,
  MdNotificationsActive,
  MdQrCodeScanner,
} from 'react-icons/md';
import LineAreaChart from '../../components/charts/LineAreaChart';
import { useAuth } from '../../contexts/AuthContext';
import * as studentsApi from '../../services/api/students';
import usePolling from '../../hooks/usePolling';

export default function StudentDashboard() {
  const textSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const scheduleCardBg = useColorModeValue('brand.50', 'navy.700');
  const scheduleCardBorderColor = useColorModeValue('brand.100', 'whiteAlpha.100');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);

  usePolling(async () => {
    try {
      const { rows } = await studentsApi.list({ page: 1, pageSize: 1 });
      const student = rows?.[0];
      if (!student) {
        setStats(null);
        setSchedules([]);
        setAttendanceTrend([]);
        return;
      }

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const [nextStats, trend, nextSchedules] = await Promise.all([
        studentsApi.getDashboardStats(student.id),
        studentsApi.getAttendanceTrend(student.id),
        studentsApi.listSchedules({
          className: student.class,
          section: student.section,
          day: today,
        }),
      ]);
      setStats(nextStats);
      setAttendanceTrend(Array.isArray(trend) ? trend : []);
      setSchedules(Array.isArray(nextSchedules) ? nextSchedules : []);
    } catch (err) {
      console.error('Failed to refresh student dashboard data', err);
    }
  }, 30000, user?.role === 'student');

  return (
    <Box pt={{ base: '20px', md: '10px' }} pb='40px'>
      {/* Header */}
      <Flex align='center' justify='space-between' mb='24px' wrap='wrap' gap={3}>
        <Box>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='800' color={textColor} letterSpacing='-0.5px'>
            Student Portal
          </Text>
          <Text fontSize='sm' color={textSecondary}>
            Overview of your daily schedule, assignments, and exam grades
          </Text>
        </Box>
        <Button
          size='sm'
          variant='brand'
          leftIcon={<Icon as={MdQrCodeScanner} />}
          onClick={() => navigate('/student/attendance/qr')}
          boxShadow='0 4px 14px rgba(37, 99, 235, 0.3)'
        >
          Scan Attendance QR
        </Button>
      </Flex>

      {/* Stats Cards Row */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 5 }} spacing='16px' mb='24px'>
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)'
              icon={<Icon as={MdClass} w='22px' h='22px' color='white' />}
            />
          }
          name="Today's Classes"
          value={stats ? String(stats.todaysClasses) : '—'}
          trendColor='#2563EB'
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #10B981 0%, #34D399 100%)'
              icon={<Icon as={MdCheckCircle} w='22px' h='22px' color='white' />}
            />
          }
          name='Attendance %'
          value={stats?.attendance == null ? '—' : `${stats.attendance}%`}
          trendData={attendanceTrend}
          trendColor='#10B981'
          trendFormatter={(v) => `${v}%`}
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)'
              icon={<Icon as={MdAssignment} w='22px' h='22px' color='white' />}
            />
          }
          name='Pending Work'
          value={stats ? String(stats.pendingAssignments) : '—'}
          trendColor='#F59E0B'
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)'
              icon={<Icon as={MdOutlineEvent} w='22px' h='22px' color='white' />}
            />
          }
          name='Upcoming Exams'
          value={stats ? String(stats.upcomingExams) : '—'}
          trendColor='#0D9488'
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)'
              icon={<Icon as={MdNotificationsActive} w='22px' h='22px' color='white' />}
            />
          }
          name='Announcements'
          value={stats ? String(stats.notifications) : '—'}
          trendColor='#3B82F6'
        />
      </SimpleGrid>

      {/* Schedule and Quick Actions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing='20px' mb='24px'>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='16px'>
            Today's Schedule
          </Text>
          <VStack align='stretch' spacing={3}>
            {schedules.length > 0 ? (
              schedules.map((c) => (
                <Flex
                  key={c.id || c.subjectName}
                  justify='space-between'
                  align='center'
                  p='12px'
                  bg={scheduleCardBg}
                  borderRadius='10px'
                  border='1px solid'
                  borderColor={scheduleCardBorderColor}
                >
                  <Text fontWeight='700' fontSize='sm' color={textColor} isTruncated maxW='60%'>
                    {c.subjectName} - {c.topic || c.className}
                  </Text>
                  <HStack>
                    <Badge colorScheme='blue' borderRadius='6px' px='2'>
                      {c.startTime} - {c.endTime}
                    </Badge>
                    <Badge variant='outline' borderRadius='6px' px='2'>
                      {c.room || 'Classroom'}
                    </Badge>
                  </HStack>
                </Flex>
              ))
            ) : (
              <Box py={6} textAlign='center'>
                <Text color={textSecondary} fontSize='sm'>
                  No classes are scheduled for today.
                </Text>
              </Box>
            )}
          </VStack>
        </Card>

        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='16px'>
            Quick Navigation
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing='12px'>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdAssignment} color='brand.500' />}
              variant='outline'
              onClick={() => navigate('/student/assignments/list')}
              borderRadius='10px'
            >
              Assignments & Tasks
            </Button>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdCheckCircle} color='green.500' />}
              variant='outline'
              onClick={() => navigate('/student/attendance/daily')}
              borderRadius='10px'
            >
              Attendance Records
            </Button>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdOutlineEvent} color='accent.500' />}
              variant='outline'
              onClick={() => navigate('/student/exams/timetable')}
              borderRadius='10px'
            >
              Exam Timetable
            </Button>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdNotificationsActive} color='teal.500' />}
              variant='outline'
              onClick={() => navigate('/student/announcements')}
              borderRadius='10px'
            >
              Announcements
            </Button>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdClass} color='blue.500' />}
              variant='outline'
              onClick={() => navigate('/student/classes/list')}
              borderRadius='10px'
            >
              My Classes & Subjects
            </Button>
            <Button
              w='100%'
              justifyContent='flex-start'
              size='md'
              leftIcon={<Icon as={MdQrCodeScanner} color='brand.500' />}
              variant='outline'
              onClick={() => navigate('/student/attendance/qr')}
              borderRadius='10px'
            >
              QR Scanner
            </Button>
          </SimpleGrid>
        </Card>
      </SimpleGrid>

      {/* Analytics Charts */}
      <SimpleGrid columns={{ base: 1 }} spacing='20px'>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Attendance Trend
          </Text>
          {attendanceTrend.some((value) => Number.isFinite(value)) ? (
            <LineAreaChart
              chartData={[{ name: 'Attendance %', data: attendanceTrend }]}
              chartOptions={{
                chart: { toolbar: { show: false } },
                stroke: { curve: 'smooth', width: 3 },
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 0.2,
                    opacityFrom: 0.5,
                    opacityTo: 0.05,
                    stops: [0, 90, 100],
                  },
                },
                xaxis: { categories: ['W1', 'W2', 'W3', 'W4', 'W5'] },
                colors: ['#10B981'],
                dataLabels: { enabled: false },
                grid: { padding: { left: 12, right: 12 } },
                tooltip: { enabled: true, shared: true, intersect: false, y: { formatter: (v) => `${v}%` } },
              }}
            />
          ) : (
            <Text color={textSecondary} fontSize='sm' textAlign='center' py='12'>
              No attendance records are available for this period.
            </Text>
          )}
        </Card>

      </SimpleGrid>
    </Box>
  );
}
