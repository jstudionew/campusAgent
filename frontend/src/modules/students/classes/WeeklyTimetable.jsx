import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  HStack,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdFileDownload } from 'react-icons/md';
import Card from '../../../components/card/Card';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';
import * as studentsApi from '../../../services/api/students';

const formatTime = (value) => String(value || '').slice(0, 5) || '—';
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function WeeklyTimetable() {
  const { user } = useAuth();
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const [student, setStudent] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSchedule = useCallback(async () => {
    try {
      if (user?.role !== 'student') {
        throw new Error('The timetable is only available to the signed-in student.');
      }
      const studentResponse = await studentsApi.list({ pageSize: 1 });
      const currentStudent = studentResponse?.rows?.[0];
      if (!currentStudent?.id) {
        throw new Error('No student profile is linked to this account.');
      }
      if (!currentStudent.class) {
        setStudent(currentStudent);
        setSchedules([]);
        setError('');
        return;
      }
      const scheduleRows = await studentsApi.listSchedules({
        className: currentStudent.class,
        section: currentStudent.section || undefined,
      });
      setStudent(currentStudent);
      setSchedules(Array.isArray(scheduleRows) ? scheduleRows : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load the timetable.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  usePolling(loadSchedule, 30000, user?.role === 'student');

  const days = useMemo(() => {
    const byDay = new Map();
    schedules.forEach((schedule) => {
      if (schedule.dayName) byDay.set(schedule.dayName, Number(schedule.dayOfWeek));
    });
    return [...byDay.entries()]
      .sort((first, second) => first[1] - second[1])
      .map(([name]) => name);
  }, [schedules]);

  const selectedDayName = days.includes(selectedDay) ? selectedDay : days[0] || '';
  const timeSlots = useMemo(() => {
    const values = new Map();
    schedules.forEach((schedule) => {
      const key = `${schedule.startTime || ''}|${schedule.endTime || ''}`;
      values.set(key, { key, startTime: schedule.startTime, endTime: schedule.endTime });
    });
    return [...values.values()].sort((first, second) =>
      String(first.startTime || '').localeCompare(String(second.startTime || ''))
    );
  }, [schedules]);

  const scheduledDays = days.length;
  const exportCSV = () => {
    const rows = [
      ['Day', 'Start', 'End', 'Class', 'Section', 'Subject', 'Teacher', 'Room'].map(csvCell).join(','),
      ...schedules.map((schedule) => [
        schedule.dayName,
        formatTime(schedule.startTime),
        formatTime(schedule.endTime),
        schedule.class,
        schedule.section,
        schedule.subject,
        schedule.teacherName,
        schedule.room,
      ].map(csvCell).join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'student-weekly-timetable.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const classLabel = student
    ? [student.class, student.section].filter(Boolean).join('-') || '—'
    : '—';

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="bold" mb="6px">Weekly Timetable</Text>
      <Text fontSize="md" color={secondaryText} mb="16px">Schedule for class {classLabel}</Text>

      {error && (
        <Alert status="error" mb="16px">
          <AlertIcon />
          <Box flex="1">{error}</Box>
          <Button size="sm" onClick={loadSchedule}>Retry</Button>
        </Alert>
      )}

      <HStack mb="16px" justify="space-between" flexWrap="wrap">
        <Text><strong>Scheduled days:</strong> {loading || error ? '—' : scheduledDays}</Text>
        <HStack>
          {days.length > 0 && (
            <Select size="sm" value={selectedDayName} onChange={(event) => setSelectedDay(event.target.value)} maxW="180px">
              {days.map((day) => <option key={day} value={day}>{day}</option>)}
            </Select>
          )}
          <Button size="sm" leftIcon={<MdFileDownload />} onClick={exportCSV} isDisabled={!schedules.length}>
            Export CSV
          </Button>
        </HStack>
      </HStack>

      <Card p="0">
        {loading ? (
          <Center p="8"><Spinner /></Center>
        ) : schedules.length === 0 ? (
          <Text p="6" color={secondaryText} textAlign="center">
            {error ? 'Timetable data could not be loaded.' : 'No timetable records are available for this class.'}
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="striped">
              <Thead bg={headerBg}>
                <Tr><Th>Time</Th>{days.map((day) => <Th key={day}>{day}</Th>)}</Tr>
              </Thead>
              <Tbody>
                {timeSlots.map((slot) => (
                  <Tr key={slot.key}>
                    <Td whiteSpace="nowrap">{formatTime(slot.startTime)}–{formatTime(slot.endTime)}</Td>
                    {days.map((day) => {
                      const entries = schedules.filter((schedule) =>
                        schedule.dayName === day &&
                        schedule.startTime === slot.startTime &&
                        schedule.endTime === slot.endTime
                      );
                      return (
                        <Td key={`${slot.key}-${day}`}>
                          {entries.length ? entries.map((entry) => (
                            <Box key={entry.id} mb="1">
                              <Text fontWeight="semibold">{entry.subject || '—'}</Text>
                              <Text fontSize="xs" color={secondaryText}>
                                {[entry.teacherName, entry.room].filter(Boolean).join(' • ') || '—'}
                              </Text>
                            </Box>
                          )) : '—'}
                        </Td>
                      );
                    })}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>

      {selectedDayName && schedules.length > 0 && (
        <Card mt="16px" p="16px">
          <Text fontWeight="bold" mb="10px">{selectedDayName} schedule</Text>
          <Table size="sm">
            <Thead><Tr><Th>Time</Th><Th>Subject</Th><Th>Teacher</Th><Th>Room</Th></Tr></Thead>
            <Tbody>
              {schedules.filter((schedule) => schedule.dayName === selectedDayName).map((schedule) => (
                <Tr key={schedule.id}>
                  <Td>{formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}</Td>
                  <Td>{schedule.subject || '—'}</Td>
                  <Td>{schedule.teacherName || '—'}</Td>
                  <Td>{schedule.room || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Card>
      )}
    </Box>
  );
}
