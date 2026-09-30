import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Text,
  Flex,
  Center,
  HStack,
  Icon,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { MdCheck, MdClose, MdEventBusy } from 'react-icons/md';

const AttendanceCalendar = ({ studentId, month, attendanceData, onDateSelect }) => {
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(month || new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const weekDayColor = useColorModeValue('gray.600', 'gray.300');
  const defaultDayColor = useColorModeValue('gray.800', 'gray.100');

  // Colors for attendance status
  const statusColors = {
    present: {
      bg: useColorModeValue('green.50', 'green.900'),
      text: useColorModeValue('green.700', 'green.100'),
      border: useColorModeValue('green.200', 'green.700'),
    },
    absent: {
      bg: useColorModeValue('red.50', 'red.900'),
      text: useColorModeValue('red.700', 'red.100'),
      border: useColorModeValue('red.200', 'red.700'),
    },
    late: {
      bg: useColorModeValue('orange.50', 'orange.900'),
      text: useColorModeValue('orange.700', 'orange.100'),
      border: useColorModeValue('orange.200', 'orange.700'),
    },
    leave: {
      bg: useColorModeValue('yellow.50', 'yellow.900'),
      text: useColorModeValue('yellow.800', 'yellow.100'),
      border: useColorModeValue('yellow.200', 'yellow.700'),
    },
    'not-marked': {
      bg: useColorModeValue('gray.50', 'gray.700'),
      text: useColorModeValue('gray.700', 'gray.100'),
      border: useColorModeValue('gray.200', 'gray.600'),
    },
  };

  // Generate calendar days
  useEffect(() => {
    generateCalendarDays(currentMonth);
  }, [currentMonth]);
  
  // Update month when prop changes
  useEffect(() => {
    if (month && month.getTime() !== currentMonth.getTime()) {
      setCurrentMonth(month);
    }
  }, [month]);
  
  // Generate array of days for calendar
  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Day of the week for the first day (0-6, 0 is Sunday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Total days in the month
    const daysInMonth = lastDay.getDate();
    
    // Create array for calendar grid
    const days = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, day: '', status: null });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const status = attendanceData[dateString] ? attendanceData[dateString].status : 'not-marked';
      
      days.push({
        date,
        day,
        status,
        checkIn: attendanceData[dateString] ? attendanceData[dateString].checkIn : null,
        checkOut: attendanceData[dateString] ? attendanceData[dateString].checkOut : null
      });
    }
    
    // Fill remaining slots in the last week
    const remainingDays = 7 - (days.length % 7 || 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push({ date: null, day: '', status: null });
      }
    }
    
    setCalendarDays(days);
  };
  
  // Handle date selection
  const handleDateClick = (day) => {
    if (day.date) {
      setSelectedDate(day.date);
      if (onDateSelect) {
        onDateSelect(day.date);
      }
    }
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };
  
  // Get today's date for highlighting
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <Icon as={MdCheck} color="green.500" boxSize={4} />;
      case 'absent':
        return <Icon as={MdClose} color="red.500" boxSize={4} />;
      case 'leave':
        return <Icon as={MdEventBusy} color="yellow.500" boxSize={4} />;
      case 'late':
        return <Icon as={MdCheck} color="orange.500" boxSize={4} />;
      default:
        return null;
    }
  };
  
  // Week days header
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      {/* Calendar Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <IconButton
          icon={<ChevronLeftIcon />}
          aria-label="Previous month"
          variant="ghost"
          onClick={goToPreviousMonth}
        />
        <Text fontSize="lg" fontWeight="bold">
          {currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <IconButton
          icon={<ChevronRightIcon />}
          aria-label="Next month"
          variant="ghost"
          onClick={goToNextMonth}
        />
      </Flex>
      
      {/* Week Days Header */}
      <Grid templateColumns="repeat(7, 1fr)" mb={2}>
        {weekDays.map((day, index) => (
          <GridItem key={index}>
            <Center py={2} fontWeight="medium" color={weekDayColor}>
              {day}
            </Center>
          </GridItem>
        ))}
      </Grid>
      
      {/* Calendar Grid */}
      <Grid templateColumns="repeat(7, 1fr)" gap={2}>
        {calendarDays.map((day, index) => {
          const isSelected = selectedDate && day.date && 
                           selectedDate.toDateString() === day.date.toDateString();
          const isToday = day.date && day.date.toDateString() === today.toDateString();
          const statusColor = day.status ? statusColors[day.status] : null;
          
          return (
            <GridItem key={index}>
              {day.date ? (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  py={2}
                  borderWidth={isSelected ? 2 : isToday ? 1 : 0}
                  borderColor={isSelected ? 'blue.500' : isToday ? 'blue.300' : 'transparent'}
                  borderRadius="md"
                  bg={statusColor ? statusColor.bg : 'transparent'}
                  color={statusColor ? statusColor.text : defaultDayColor}
                  cursor="pointer"
                  onClick={() => handleDateClick(day)}
                  position="relative"
                  h="80px"
                >
                  <Text fontWeight={isToday ? 'bold' : 'normal'}>
                    {day.day}
                  </Text>
                  
                  {day.status && day.status !== 'not-marked' && (
                    <Box mt={1}>
                      {getStatusIcon(day.status)}
                    </Box>
                  )}
                  
                  {day.checkIn && (
                    <Text fontSize="xs" mt={1} color={statusColor ? statusColor.text : defaultDayColor}>
                      {day.checkIn.substring(0, 5)}
                    </Text>
                  )}
                </Flex>
              ) : (
                <Box py={2} h="80px" />
              )}
            </GridItem>
          );
        })}
      </Grid>
      
      {/* Legend */}
      <HStack spacing={4} mt={4} justify="center">
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="green.500" />
          <Text fontSize="sm">Present</Text>
        </HStack>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="red.500" />
          <Text fontSize="sm">Absent</Text>
        </HStack>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="yellow.500" />
          <Text fontSize="sm">Leave</Text>
        </HStack>
        <HStack>
          <Box w={3} h={3} borderRadius="full" bg="orange.500" />
          <Text fontSize="sm">Late</Text>
        </HStack>
      </HStack>
    </Box>
  );
};

export default AttendanceCalendar;
