import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Flex, Heading, Input, SimpleGrid, Table, Tbody,
  Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import usePolling from '../../../../hooks/usePolling';
import * as reportsApi from '../../../../services/api/reports';

export default function AttendanceAnalytics() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };
      const [summaryResult, classResult] = await Promise.all([
        reportsApi.attendanceSummary(params),
        reportsApi.attendanceByClass(params),
      ]);
      setSummary({
        present: Number(summaryResult?.counts?.present || 0),
        absent: Number(summaryResult?.counts?.absent || 0),
        late: Number(summaryResult?.counts?.late || 0),
        total: Number(summaryResult?.total || 0),
      });
      const items = Array.isArray(classResult?.items) ? classResult.items : [];
      setRows(items.map((item) => ({
        className: [item.class, item.section].filter(Boolean).join('-') || '—',
        present: Number(item.present || 0),
        absent: Number(item.absent || 0),
        late: Number(item.late || 0),
        total: Number(item.total || 0),
      })));
    } catch (requestError) {
      setRows([]);
      setSummary(null);
      setError(requestError?.data?.message || requestError?.message || 'Unable to load attendance reports.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  usePolling(loadReport, 30000);

  const filteredRows = useMemo(() => rows.filter((row) =>
    row.className.toLowerCase().includes(search.trim().toLowerCase())
  ), [rows, search]);
  const overall = summary?.total ? Math.round(summary.present * 100 / summary.total) : null;

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading as="h3" size="lg" mb={1}>Attendance Reports</Heading>
          <Text color="gray.500">Class-wise attendance from recorded attendance data</Text>
        </Box>
        <Button onClick={loadReport} isLoading={loading} variant="outline">Refresh</Button>
      </Flex>

      {error && <Alert status="error" mb={5}><AlertIcon />{error}</Alert>}

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <MiniStatistics name="Overall" value={overall === null ? '—' : `${overall}%`} />
        <MiniStatistics name="Present" value={summary ? String(summary.present) : '—'} />
        <MiniStatistics name="Absent" value={summary ? String(summary.absent) : '—'} />
        <MiniStatistics name="Late" value={summary ? String(summary.late) : '—'} />
      </SimpleGrid>

      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} maxW="220px" />
          <Input type="date" aria-label="To date" value={toDate} onChange={(e) => setToDate(e.target.value)} maxW="220px" />
          <Input placeholder="Search class" value={search} onChange={(e) => setSearch(e.target.value)} maxW="280px" />
          <Button colorScheme="blue" onClick={loadReport} isLoading={loading}>Apply filters</Button>
        </Flex>
      </Card>

      <Card>
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg={headerBg}>
              <Tr><Th>Class</Th><Th isNumeric>Present</Th><Th isNumeric>Absent</Th><Th isNumeric>Late</Th><Th isNumeric>Overall</Th></Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={5} textAlign="center">Loading attendance report…</Td></Tr>
              ) : filteredRows.length === 0 ? (
                <Tr><Td colSpan={5} textAlign="center">{error ? 'Attendance data could not be loaded.' : 'No attendance records found for this period.'}</Td></Tr>
              ) : filteredRows.map((row) => {
                const rate = row.total ? Math.round(row.present * 100 / row.total) : 0;
                return (
                  <Tr key={row.className} _hover={{ bg: rowHoverBg }}>
                    <Td fontWeight="600">{row.className}</Td>
                    <Td isNumeric>{row.present}</Td>
                    <Td isNumeric>{row.absent}</Td>
                    <Td isNumeric>{row.late}</Td>
                    <Td isNumeric>{rate}%</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
