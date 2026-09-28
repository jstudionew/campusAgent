import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Flex, Heading, Input, Table, Tbody, Td, Text, Th,
  Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import Card from '../../../../components/card/Card';
import { reportsApi } from '../../../../services/moduleApis';
import { useAuth } from '../../../../contexts/AuthContext';
import usePolling from '../../../../hooks/usePolling';

export default function StudentPerformanceReport() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [className, setClassName] = useState('');
  const [examType, setExamType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headerBg = useColorModeValue('gray.50', 'gray.800');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await reportsApi.student.performance({
        class: className.trim() || undefined,
        examType: examType.trim() || undefined,
      });
      setRows(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setRows([]);
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load student performance data.');
    } finally {
      setLoading(false);
    }
  }, [className, examType, isAuthenticated]);

  usePolling(loadReport, 30000, !authLoading && isAuthenticated);

  const filteredRows = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase();
    return !term || String(row.studentName || '').toLowerCase().includes(term);
  }), [rows, search]);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading as="h3" size="lg" mb={1}>Student Performance</Heading>
          <Text color="gray.500">Exam results from recorded student marks</Text>
        </Box>
        <Button onClick={loadReport} isLoading={loading} isDisabled={!isAuthenticated} variant="outline">Refresh</Button>
      </Flex>

      {error && <Alert status="error" mb={5}><AlertIcon />{error}</Alert>}

      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <Input placeholder="Class (optional)" value={className} onChange={(e) => setClassName(e.target.value)} maxW="220px" />
          <Input placeholder="Exam name (optional)" value={examType} onChange={(e) => setExamType(e.target.value)} maxW="260px" />
          <Input placeholder="Search student" value={search} onChange={(e) => setSearch(e.target.value)} maxW="280px" />
          <Button colorScheme="blue" onClick={loadReport} isLoading={loading} isDisabled={!isAuthenticated}>Generate report</Button>
        </Flex>
      </Card>

      <Card>
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg={headerBg}>
              <Tr><Th>Student</Th><Th>Class</Th><Th isNumeric>Configured Total Marks</Th><Th isNumeric>Obtained Marks</Th><Th>Recorded Grades</Th></Tr>
            </Thead>
            <Tbody>
              {authLoading || loading ? (
                <Tr><Td colSpan={5} textAlign="center">Loading student performance report…</Td></Tr>
              ) : filteredRows.length === 0 ? (
                <Tr><Td colSpan={5} textAlign="center">{error ? 'Student performance data could not be loaded.' : 'No exam results found for the selected filters.'}</Td></Tr>
              ) : filteredRows.map((row, index) => (
                <Tr key={`${row.studentName || 'student'}-${row.className || 'class'}-${index}`}>
                  <Td fontWeight="600">{row.studentName || '—'}</Td>
                  <Td>{row.className || '—'}</Td>
                  <Td isNumeric>{row.totalMarks == null ? '—' : Number(row.totalMarks)}</Td>
                  <Td isNumeric>{row.obtainedMarks == null ? '—' : Number(row.obtainedMarks)}</Td>
                  <Td>{row.grade || '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
