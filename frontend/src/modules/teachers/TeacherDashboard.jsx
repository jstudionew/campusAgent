import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  SimpleGrid,
  Text,
  Button,
  HStack,
  VStack,
  Icon,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/card/Card';
import MiniStatistics from '../../components/card/MiniStatistics';
import IconBox from '../../components/icons/IconBox';
import {
  MdClass,
  MdPeople,
  MdCheckCircle,
  MdAssignment,
  MdWarningAmber,
  MdEvent,
  MdUploadFile,
  MdQrCodeScanner,
} from 'react-icons/md';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import { useAuth } from '../../contexts/AuthContext';
import * as teachersApi from '../../services/api/teachers';

export default function TeacherDashboard() {
  const textSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    todaysClasses: 5,
    students: 124,
    attendancePending: 1,
    homeworkDue: 3,
    alerts: 0,
    upcomingClass: {
      className: 'Grade 10-A',
      subject: 'Mathematics',
      room: 'Hall B-2',
      startTime: '10:30 AM',
      endTime: '11:15 AM',
    },
    attendanceTrend: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      series: [{ name: 'Attendance %', data: [92, 94, 91, 95, 96, 0, 0] }],
    },
    homeworkStats: {
      categories: ['Algebra I', 'Geometry', 'Calculus', 'Trig', 'Stats'],
      series: [
        { name: 'Submitted', data: [28, 30, 25, 29, 27] },
        { name: 'Pending', data: [4, 2, 5, 1, 3] },
      ],
    },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { rows } = await teachersApi.list({});
        if (rows && rows.length > 0) {
          const me = rows[0];
          const data = await teachersApi.getDashboardStats(me.id);
          if (data) setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };

    if (user?.role === 'teacher') {
      fetchStats();
    }
  }, [user]);

  const homeworkBarSeries = stats.homeworkStats.series;
  const homeworkBarOptions = {
    chart: { stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '40%', borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: { categories: stats.homeworkStats.categories },
    grid: { strokeDashArray: 4, borderColor: useColorModeValue('rgba(148, 163, 184, 0.2)', 'rgba(255, 255, 255, 0.05)') },
    colors: ['#10B981', '#F59E0B'],
    legend: { position: 'top' },
  };

  const attendanceTrendSeries = stats.attendanceTrend.series;
  const attendanceTrendOptions = {
    chart: { toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    xaxis: { categories: stats.attendanceTrend.categories },
    yaxis: { labels: { formatter: (v) => `${v}%` }, min: 0, max: 100 },
    grid: { strokeDashArray: 4, borderColor: useColorModeValue('rgba(148, 163, 184, 0.2)', 'rgba(255, 255, 255, 0.05)') },
    colors: ['#2563EB'],
    tooltip: { y: { formatter: (v) => `${v}%` } },
    legend: { show: false },
  };

  return (
    <Box pt={{ base: '20px', md: '10px' }} pb='40px'>
      {/* Header */}
      <Flex align='center' justify='space-between' mb='24px' wrap='wrap' gap={3}>
        <Box>
          <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight='800' color={textColor} letterSpacing='-0.5px'>
            Teacher Workspace
          </Text>
          <Text fontSize='sm' color={textSecondary}>
            Class management, daily roll call, homework, and student marks
          </Text>
        </Box>
        <HStack spacing={3}>
          <Button
            size='sm'
            variant='outline'
            leftIcon={<Icon as={MdQrCodeScanner} />}
            onClick={() => navigate('/teacher/attendance/qr')}
          >
            My QR Code
          </Button>
          <Button
            size='sm'
            variant='brand'
            leftIcon={<Icon as={MdCheckCircle} />}
            onClick={() => navigate('/teacher/students/attendance/daily')}
          >
            Take Roll Call
          </Button>
        </HStack>
      </Flex>

      {/* KPI Cards */}
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
          value={String(stats.todaysClasses)}
          trendData={[1, 2, 2, 3, 3]}
          trendColor='#2563EB'
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)'
              icon={<Icon as={MdPeople} w='22px' h='22px' color='white' />}
            />
          }
          name='Enrolled Students'
          value={String(stats.students)}
          trendData={[70, 80, 90, 95, 96]}
          trendColor='#0D9488'
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
          name='Attendance Done'
          value={String(stats.attendancePending === 0 ? 'All' : `${stats.attendancePending} Pending`)}
          trendData={[3, 2, 2, 1, 2]}
          trendColor='#10B981'
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
          name='Homework Due'
          value={String(stats.homeworkDue)}
          trendData={[2, 3, 4, 5, 5]}
          trendColor='#F59E0B'
        />
        <MiniStatistics
          compact
          startContent={
            <IconBox
              w='44px'
              h='44px'
              bg='linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
              icon={<Icon as={MdWarningAmber} w='22px' h='22px' color='white' />}
            />
          }
          name='Academic Alerts'
          value={String(stats.alerts)}
          trendData={[0, 1, 0, 1, 0]}
          trendColor='#EF4444'
        />
      </SimpleGrid>

      {/* Upcoming class and Quick Actions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing='20px' mb='24px'>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='16px'>
            Next Scheduled Class
          </Text>
          {stats.upcomingClass ? (
            <Flex
              justify='space-between'
              align='center'
              p='14px'
              bg={useColorModeValue('brand.50', 'navy.700')}
              borderRadius='12px'
              border='1px solid'
              borderColor={useColorModeValue('brand.100', 'whiteAlpha.100')}
              mb='16px'
            >
              <VStack align='start' spacing={1}>
                <Text fontWeight='700' fontSize='md' color={textColor}>
                  {stats.upcomingClass.className} - {stats.upcomingClass.subject}
                </Text>
                <Text fontSize='xs' color={textSecondary}>
                  Room: {stats.upcomingClass.room || 'Main Hall'}
                </Text>
              </VStack>
              <HStack>
                <Badge colorScheme='blue' borderRadius='6px' px='2.5' py='1'>
                  {stats.upcomingClass.startTime} - {stats.upcomingClass.endTime}
                </Badge>
              </HStack>
            </Flex>
          ) : (
            <Flex justify='center' align='center' h='80px'>
              <Text color={textSecondary}>No upcoming classes scheduled for today.</Text>
            </Flex>
          )}

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing='10px'>
            <Button
              leftIcon={<Icon as={MdCheckCircle} />}
              variant='brand'
              size='sm'
              onClick={() => navigate('/teacher/students/attendance/daily')}
            >
              Take Attendance
            </Button>
            <Button
              leftIcon={<Icon as={MdAssignment} />}
              variant='outline'
              size='sm'
              onClick={() => navigate('/teacher/assignments/create')}
            >
              Assign Homework
            </Button>
            <Button
              leftIcon={<Icon as={MdEvent} />}
              variant='outline'
              size='sm'
              onClick={() => navigate('/teacher/schedule/weekly')}
            >
              Weekly Schedule
            </Button>
          </SimpleGrid>
        </Card>

        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='16px'>
            Teacher Operations
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing='10px'>
            <Button
              leftIcon={<Icon as={MdCheckCircle} color='green.500' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/students/attendance/daily')}
            >
              Student Attendance
            </Button>
            <Button
              leftIcon={<Icon as={MdAssignment} color='brand.500' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/assignments/create')}
            >
              Create Assignment
            </Button>
            <Button
              leftIcon={<Icon as={MdUploadFile} color='accent.500' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/exams/upload-marks')}
            >
              Upload Marks & Grades
            </Button>
            <Button
              leftIcon={<Icon as={MdPeople} color='teal.500' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/students/list')}
            >
              Student Directory
            </Button>
            <Button
              leftIcon={<Icon as={MdClass} color='blue.500' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/classes/list')}
            >
              My Classes
            </Button>
            <Button
              leftIcon={<Icon as={MdEvent} color='brand.600' />}
              variant='outline'
              size='md'
              justifyContent='flex-start'
              borderRadius='10px'
              onClick={() => navigate('/teacher/schedule/weekly')}
            >
              Timetable Schedule
            </Button>
          </SimpleGrid>
        </Card>
      </SimpleGrid>

      {/* Teaching Analytics */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing='20px'>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Weekly Attendance Trend
          </Text>
          <Box h={{ base: '240px', md: '280px' }}>
            <LineChart chartData={attendanceTrendSeries} chartOptions={attendanceTrendOptions} />
          </Box>
        </Card>
        <Card p='20px'>
          <Text fontSize='lg' fontWeight='800' color={textColor} mb='12px'>
            Homework Submission Status
          </Text>
          <Box h={{ base: '240px', md: '280px' }}>
            <BarChart chartData={homeworkBarSeries} chartOptions={homeworkBarOptions} />
          </Box>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
