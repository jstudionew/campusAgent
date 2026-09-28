import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
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
import MiniStatistics from '../../../components/card/MiniStatistics';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';
import * as studentsApi from '../../../services/api/students';

const buildRecentMonths = (count = 12) => {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return {
      key: `${year}-${month}`,
      label: date.toLocaleString(undefined, { month: 'short', year: 'numeric' }),
    };
  });
};

const months = buildRecentMonths();
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MonthlyReport() {
  const { user } = useAuth();
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(months[0].key);

  const loadRecords = useCallback(async () => {
    try {
      if (user?.role !== 'student') {
        throw new Error('Attendance records are only available to the signed-in student.');
      }
      const studentResponse = await studentsApi.list({ pageSize: 1 });
      const currentStudent = studentResponse?.rows?.[0];
      if (!currentStudent?.id) {
        throw new Error('No student profile is linked to this account.');
      }

      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = formatLocalDate(new Date(year, month - 1, 1));
      const endDate = formatLocalDate(new Date(year, month, 0));
      const response = await studentsApi.listAttendance(currentStudent.id, {
        startDate,
        endDate,
        page: 1,
        pageSize: 200,
      });

      setStudent(currentStudent);
      setRecords(Array.isArray(response?.rows) ? response.rows : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load monthly attendance records.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, user?.role]);

  usePolling(loadRecords, 30000, user?.role === 'student');

  const summary = useMemo(() => {
    const counts = { present: 0, late: 0, absent: 0 };
    records.forEach((record) => {
      const status = String(record.status || '').toLowerCase();
      if (Object.hasOwn(counts, status)) counts[status] += 1;
    });
    const total = records.length;
    return {
      ...counts,
      attendanceRate: total ? Math.round((counts.present + counts.late) * 100 / total) : null,
    };
  }, [records]);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Status', 'Remarks'],
      ...records.map((record) => [
        String(record.date || '').slice(0, 10),
        record.status || '',
        record.remarks || '',
      ]),
    ];
    const csv = rows.map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `student-attendance-${selectedMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="bold" mb="6px">Monthly Attendance</Text>
      <Text fontSize="md" color={secondaryText} mb="16px">
        {student?.name || user?.name || ''}
        {student?.rollNumber ? ` • Roll ${student.rollNumber}` : ''}
        {student?.class ? ` • Class ${student.class}${student.section ? `-${student.section}` : ''}` : ''}
      </Text>

      {error && (
        <Alert status="error" mb="16px">
          <AlertIcon />
          <Box flex="1">{error}</Box>
          <Button size="sm" onClick={loadRecords}>Retry</Button>
        </Alert>
      )}

      <HStack justify="space-between" flexWrap="wrap" mb="16px">
        <HStack>
          <Text fontWeight="semibold">Month:</Text>
          <Select
            size="sm"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            maxW="200px"
          >
            {months.map((month) => (
              <option key={month.key} value={month.key}>{month.label}</option>
            ))}
          </Select>
        </HStack>
        <Button size="sm" leftIcon={<MdFileDownload />} onClick={exportCSV} isDisabled={!records.length}>
          Export CSV
        </Button>
      </HStack>

      <HStack spacing={6} flexWrap="wrap" mb="16px">
        <MiniStatistics name="Present" value={loading || error ? '—' : String(summary.present)} />
        <MiniStatistics name="Late" value={loading || error ? '—' : String(summary.late)} />
        <MiniStatistics name="Absent" value={loading || error ? '—' : String(summary.absent)} />
        <MiniStatistics
          name="Attendance Rate"
          value={loading || error || summary.attendanceRate === null ? '—' : `${summary.attendanceRate}%`}
        />
      </HStack>

      <Card p="0">
        {loading ? (
          <Center p="8"><Spinner /></Center>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="striped">
              <Thead bg={headerBg}>
                <Tr><Th>Date</Th><Th>Status</Th><Th>Remarks</Th></Tr>
              </Thead>
              <Tbody>
                {records.map((record) => (
                  <Tr key={record.id}>
                    <Td>{String(record.date || '').slice(0, 10) || '—'}</Td>
                    <Td>
                      <Badge colorScheme={record.status === 'present' ? 'green' : record.status === 'late' ? 'yellow' : record.status === 'absent' ? 'red' : 'gray'}>
                        {record.status || '—'}
                      </Badge>
                    </Td>
                    <Td>{record.remarks || '—'}</Td>
                  </Tr>
                ))}
                {!records.length && (
                  <Tr>
                    <Td colSpan={3} textAlign="center" color={secondaryText} py="5">
                      {error ? 'Attendance records could not be loaded.' : 'No attendance records found for this month.'}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>
    </Box>
  );
}
