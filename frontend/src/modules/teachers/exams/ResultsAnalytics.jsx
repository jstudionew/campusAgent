import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, HStack, Icon, Input, Select, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import { MdAssessment, MdFileDownload, MdPercent, MdRefresh } from 'react-icons/md';
import Card from '../../../components/card/Card';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import BarChart from '../../../components/charts/BarChart';
import * as resultsApi from '../../../services/api/results';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';

export default function ResultsAnalytics() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [examId, setExamId] = useState('');
  const [queryText, setQueryText] = useState('');

  usePolling(async () => {
    try {
      const response = await resultsApi.list({ page: 1, pageSize: 200 });
      const nextResults = Array.isArray(response?.items) ? response.items : [];
      setResults(nextResults);
      setExamId((current) => (
        nextResults.some((result) => String(result.examId) === current)
          ? current
          : String(nextResults[0]?.examId || '')
      ));
    } catch (error) {
      console.error('Failed to refresh teacher examination results', error);
    }
  }, 30000, user?.role === 'teacher');

  const exams = useMemo(() => {
    const byId = new Map();
    (results || []).forEach((result) => {
      if (!byId.has(result.examId)) {
        byId.set(result.examId, { id: result.examId, title: result.examTitle || 'Untitled exam' });
      }
    });
    return Array.from(byId.values());
  }, [results]);

  const examResults = useMemo(
    () => (results || []).filter((result) => String(result.examId) === examId),
    [results, examId]
  );
  const filteredResults = useMemo(() => {
    const normalizedQuery = queryText.trim().toLowerCase();
    if (!normalizedQuery) return examResults;
    return examResults.filter((result) => (
      String(result.subject || '').toLowerCase().includes(normalizedQuery) ||
      String(result.studentName || '').toLowerCase().includes(normalizedQuery)
    ));
  }, [examResults, queryText]);

  const averageMark = useMemo(() => {
    const marks = examResults
      .map((result) => Number(result.marks))
      .filter(Number.isFinite);
    return marks.length ? marks.reduce((sum, mark) => sum + mark, 0) / marks.length : null;
  }, [examResults]);

  const subjectStats = useMemo(() => {
    const grouped = new Map();
    examResults.forEach((result) => {
      const mark = Number(result.marks);
      if (result.marks === null || result.marks === '' || !Number.isFinite(mark)) return;
      const subject = grouped.get(result.subject) || { name: result.subject, sum: 0, count: 0 };
      subject.sum += mark;
      subject.count += 1;
      grouped.set(result.subject, subject);
    });
    return Array.from(grouped.values()).map((subject) => ({
      ...subject,
      average: subject.sum / subject.count,
    }));
  }, [examResults]);

  const gradeCounts = useMemo(() => {
    const counts = new Map();
    examResults.forEach((result) => {
      if (!result.grade) return;
      counts.set(result.grade, (counts.get(result.grade) || 0) + 1);
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [examResults]);

  const subjectChart = useMemo(() => ({
    data: [{ name: 'Average recorded mark', data: subjectStats.map((subject) => subject.average) }],
    options: {
      chart: { toolbar: { show: false } },
      xaxis: { categories: subjectStats.map((subject) => subject.name) },
      yaxis: { title: { text: 'Recorded marks' } },
      colors: ['#3182CE'],
      dataLabels: { enabled: false },
    },
  }), [subjectStats]);
  const gradeChart = useMemo(() => ({
    data: [{ name: 'Result records', data: gradeCounts.map(([, count]) => count) }],
    options: {
      chart: { toolbar: { show: false } },
      xaxis: { categories: gradeCounts.map(([grade]) => grade) },
      colors: ['#805AD5'],
      dataLabels: { enabled: false },
    },
  }), [gradeCounts]);

  const exportCSV = () => {
    const header = ['Student', 'Class', 'Section', 'Subject', 'Recorded Mark', 'Grade'];
    const rows = examResults.map((result) => [
      result.studentName,
      result.class,
      result.section,
      result.subject,
      result.marks,
      result.grade,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam_results.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedExam = exams.find((exam) => String(exam.id) === examId);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Results Analytics</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>Analytics from recorded examination results.</Text>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing='16px' mb='16px'>
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<Icon as={MdAssessment} w='22px' h='22px' color='white' />} />}
          name='Selected Exam'
          value={results === null ? '—' : selectedExam?.title || 'No exam results'}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<Icon as={MdPercent} w='22px' h='22px' color='white' />} />}
          name='Recorded Results'
          value={results === null ? '—' : String(examResults.length)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#B721FF 0%,#21D4FD 100%)' icon={<Icon as={MdAssessment} w='22px' h='22px' color='white' />} />}
          name='Average Recorded Mark'
          value={results === null ? '—' : averageMark == null ? 'No marks' : averageMark.toFixed(1)}
        />
      </SimpleGrid>

      <Card p='16px' mb='16px'>
        <HStack gap={3} flexWrap='wrap' justify='space-between' align='center'>
          <HStack flexWrap='wrap'>
            <Select value={examId} onChange={(event) => setExamId(event.target.value)} size='sm' maxW='280px'>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
            </Select>
            <Input
              aria-label='Search students or subjects'
              placeholder='Search students or subjects'
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              size='sm'
              maxW='240px'
            />
          </HStack>
          <HStack>
            <Button size='sm' variant='outline' leftIcon={<Icon as={MdRefresh} />} onClick={() => setQueryText('')}>
              Clear search
            </Button>
            <Button size='sm' colorScheme='blue' leftIcon={<Icon as={MdFileDownload} />} onClick={exportCSV} isDisabled={!examResults.length}>
              Export CSV
            </Button>
          </HStack>
        </HStack>
      </Card>

      {examResults.length > 0 ? (
        <>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mb='16px'>
            <Card p='16px'>
              <Text fontWeight='700' mb='8px'>Average Recorded Mark by Subject</Text>
              <BarChart chartData={subjectChart.data} chartOptions={subjectChart.options} height={220} />
            </Card>
            <Card p='16px'>
              <Text fontWeight='700' mb='8px'>Recorded Grade Counts</Text>
              {gradeCounts.length > 0
                ? <BarChart chartData={gradeChart.data} chartOptions={gradeChart.options} height={220} />
                : <Text color={textSecondary} fontSize='sm'>No grades have been recorded for this exam.</Text>}
            </Card>
          </SimpleGrid>

          <Card p='0'>
            <Box overflowX='auto'>
              <Table size='sm' variant='striped' colorScheme='gray'>
                <Thead bg={headerBg} position='sticky' top={0} zIndex={1} boxShadow='sm'>
                  <Tr>
                    <Th>Student</Th>
                    <Th>Class</Th>
                    <Th>Section</Th>
                    <Th>Subject</Th>
                    <Th isNumeric>Recorded Mark</Th>
                    <Th>Grade</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredResults.map((result) => (
                    <Tr key={result.id} _hover={{ bg: hoverBg }}>
                      <Td>{result.studentName || '—'}</Td>
                      <Td>{result.class || '—'}</Td>
                      <Td>{result.section || '—'}</Td>
                      <Td>{result.subject}</Td>
                      <Td isNumeric>{result.marks ?? '—'}</Td>
                      <Td>{result.grade ? <Badge colorScheme='blue'>{result.grade}</Badge> : '—'}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {filteredResults.length === 0 && (
                <Text color={textSecondary} fontSize='sm' p='4'>No results match this search.</Text>
              )}
            </Box>
          </Card>
        </>
      ) : (
        <Card p='20px'>
          <Text color={textSecondary}>
            {results === null ? 'Loading examination results…' : 'No examination results are available for your assigned classes.'}
          </Text>
        </Card>
      )}
    </Box>
  );
}
