import React, { useMemo, useState } from 'react';
import { Badge, Box, Icon, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import Card from '../../../components/card/Card';
import LineChart from '../../../components/charts/LineChart';
import BarChart from '../../../components/charts/BarChart';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import { MdAssessment, MdStar, MdTimeline } from 'react-icons/md';
import * as resultsApi from '../../../services/api/results';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';

export default function PerformanceAnalytics() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const { user } = useAuth();
  const [results, setResults] = useState(null);

  usePolling(async () => {
    try {
      const response = await resultsApi.list({ page: 1, pageSize: 200 });
      setResults(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      console.error('Failed to refresh student performance results', error);
    }
  }, 30000, user?.role === 'student');

  const examResults = useMemo(() => {
    const exams = new Map();
    (results || []).forEach((result) => {
      const key = result.examId;
      if (!exams.has(key)) {
        exams.set(key, { id: key, title: result.examTitle || 'Untitled exam', marks: [] });
      }
      const mark = Number(result.marks);
      if (result.marks !== null && result.marks !== '' && Number.isFinite(mark)) {
        exams.get(key).marks.push(mark);
      }
    });
    return Array.from(exams.values()).reverse();
  }, [results]);

  const subjects = useMemo(() => {
    const grouped = new Map();
    (results || []).forEach((result) => {
      if (result.marks === null || result.marks === '') return;
      const mark = Number(result.marks);
      if (!Number.isFinite(mark)) return;
      const subject = grouped.get(result.subject) || { name: result.subject, sum: 0, count: 0, results: [] };
      subject.sum += mark;
      subject.count += 1;
      subject.results.push(result);
      grouped.set(result.subject, subject);
    });
    return Array.from(grouped.values()).map((subject) => ({
      ...subject,
      average: subject.sum / subject.count,
    }));
  }, [results]);

  const averageMark = useMemo(() => {
    const marks = (results || [])
      .map((result) => Number(result.marks))
      .filter(Number.isFinite);
    return marks.length ? marks.reduce((sum, mark) => sum + mark, 0) / marks.length : null;
  }, [results]);
  const bestSubject = useMemo(
    () => subjects.slice().sort((a, b) => b.average - a.average)[0]?.name || '—',
    [subjects]
  );
  const weakestSubject = useMemo(
    () => subjects.slice().sort((a, b) => a.average - b.average)[0]?.name || '—',
    [subjects]
  );

  const lineData = useMemo(() => [{
    name: 'Average recorded mark',
    data: examResults.map((exam) => (
      exam.marks.length
        ? exam.marks.reduce((sum, mark) => sum + mark, 0) / exam.marks.length
        : null
    )),
  }], [examResults]);
  const lineOptions = useMemo(() => ({
    xaxis: { categories: examResults.map((exam) => exam.title) },
    yaxis: { title: { text: 'Recorded marks' } },
    colors: ['#01B574'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
  }), [examResults]);
  const subjectBarData = useMemo(
    () => [{ name: 'Average recorded mark', data: subjects.map((subject) => subject.average) }],
    [subjects]
  );
  const subjectBarOptions = useMemo(() => ({
    xaxis: { categories: subjects.map((subject) => subject.name) },
    yaxis: { title: { text: 'Recorded marks' } },
    colors: ['#805AD5'],
    dataLabels: { enabled: false },
  }), [subjects]);

  const studentName = results?.[0]?.studentName || user?.name || user?.username || 'Student';

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Performance Analytics</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>{studentName}</Text>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing='16px' mb='16px'>
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<Icon as={MdAssessment} w='22px' h='22px' color='white' />} />}
          name='Average Recorded Mark'
          value={results === null ? '—' : averageMark == null ? 'No marks' : averageMark.toFixed(1)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<Icon as={MdTimeline} w='22px' h='22px' color='white' />} />}
          name='Exam Results'
          value={results === null ? '—' : String(results.length)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#FFB36D 0%,#FD7853 100%)' icon={<Icon as={MdStar} w='22px' h='22px' color='white' />} />}
          name='Highest Average Subject'
          value={bestSubject}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#f5576c 0%,#f093fb 100%)' icon={<Icon as={MdStar} w='22px' h='22px' color='white' />} />}
          name='Lowest Average Subject'
          value={weakestSubject}
        />
      </SimpleGrid>

      {results?.length ? (
        <>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing='16px' mb='16px'>
            <Card p='16px'>
              <Text fontWeight='bold' mb='8px'>Recorded Marks by Exam</Text>
              <LineChart chartData={lineData} chartOptions={lineOptions} height={240} />
            </Card>
            <Card p='16px'>
              <Text fontWeight='bold' mb='8px'>Average Recorded Marks by Subject</Text>
              <BarChart chartData={subjectBarData} chartOptions={subjectBarOptions} height={240} />
            </Card>
          </SimpleGrid>

          <Card p='0'>
            <Table size='sm' variant='striped' colorScheme='gray'>
              <Thead>
                <Tr>
                  <Th>Subject</Th>
                  {examResults.map((exam) => <Th key={exam.id}>{exam.title}</Th>)}
                  <Th>Average Mark</Th>
                </Tr>
              </Thead>
              <Tbody>
                {subjects.map((subject) => (
                  <Tr key={subject.name}>
                    <Td>{subject.name}</Td>
                    {examResults.map((exam) => {
                      const result = subject.results.find((entry) => entry.examId === exam.id);
                      return (
                        <Td key={exam.id}>
                          {result ? (
                            <Badge colorScheme='blue'>
                              {result.marks ?? '—'}{result.grade ? ` · ${result.grade}` : ''}
                            </Badge>
                          ) : '—'}
                        </Td>
                      );
                    })}
                    <Td>{subject.average.toFixed(1)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>
        </>
      ) : (
        <Card p='20px'>
          <Text color={textSecondary}>
            {results === null ? 'Loading examination results…' : 'No examination results have been recorded for your account.'}
          </Text>
        </Card>
      )}
    </Box>
  );
}
