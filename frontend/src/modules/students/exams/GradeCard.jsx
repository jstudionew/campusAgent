import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, HStack, Icon, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import { MdAssessment, MdFileDownload, MdPrint, MdStar } from 'react-icons/md';
import Card from '../../../components/card/Card';
import BarChart from '../../../components/charts/BarChart';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import * as resultsApi from '../../../services/api/results';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';

export default function GradeCard() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const { user } = useAuth();
  const [results, setResults] = useState(null);

  usePolling(async () => {
    try {
      const response = await resultsApi.list({ page: 1, pageSize: 200 });
      setResults(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      console.error('Failed to refresh student grade records', error);
    }
  }, 30000, user?.role === 'student');

  const latestExamId = results?.[0]?.examId;
  const latestExamResults = useMemo(
    () => (results || []).filter((result) => result.examId === latestExamId),
    [results, latestExamId]
  );
  const subjectResults = useMemo(() => {
    const grouped = new Map();
    latestExamResults.forEach((result) => {
      const subject = grouped.get(result.subject) || { name: result.subject, marks: [], grades: [] };
      const mark = Number(result.marks);
      if (result.marks !== null && result.marks !== '' && Number.isFinite(mark)) subject.marks.push(mark);
      if (result.grade) subject.grades.push(result.grade);
      grouped.set(result.subject, subject);
    });
    return Array.from(grouped.values()).map((subject) => ({
      ...subject,
      averageMark: subject.marks.length
        ? subject.marks.reduce((sum, mark) => sum + mark, 0) / subject.marks.length
        : null,
    }));
  }, [latestExamResults]);

  const recordedMarks = latestExamResults
    .map((result) => Number(result.marks))
    .filter(Number.isFinite);
  const totalRecordedMarks = recordedMarks.reduce((sum, mark) => sum + mark, 0);
  const gradedSubjects = subjectResults.filter((subject) => subject.grades.length > 0).length;
  const bestSubject = subjectResults.slice().sort((a, b) => (b.averageMark ?? -Infinity) - (a.averageMark ?? -Infinity))[0];
  const studentName = results?.[0]?.studentName || user?.name || user?.username || 'Student';

  const chartData = useMemo(
    () => [{ name: 'Average recorded mark', data: subjectResults.map((subject) => subject.averageMark) }],
    [subjectResults]
  );
  const chartOptions = useMemo(() => ({
    xaxis: { categories: subjectResults.map((subject) => subject.name) },
    yaxis: { title: { text: 'Recorded marks' } },
    colors: ['#805AD5'],
    dataLabels: { enabled: false },
  }), [subjectResults]);

  const exportCSV = () => {
    const header = ['Student', 'Exam', 'Subject', 'Recorded Mark', 'Grade'];
    const rows = latestExamResults.map((result) => [
      result.studentName,
      result.examTitle,
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
    link.download = 'student_grade_card.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const latestExamTitle = latestExamResults[0]?.examTitle;

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>
        {latestExamTitle ? `Grade Card · ${latestExamTitle}` : 'Grade Card'}
      </Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>{studentName}</Text>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing='16px' mb='16px'>
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<Icon as={MdAssessment} w='22px' h='22px' color='white' />} />}
          name='Total Recorded Marks'
          value={results === null ? '—' : recordedMarks.length ? totalRecordedMarks.toFixed(1) : 'No marks'}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<Icon as={MdAssessment} w='22px' h='22px' color='white' />} />}
          name='Result Records'
          value={results === null ? '—' : String(latestExamResults.length)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#805AD5 0%,#D53F8C 100%)' icon={<Text as='span' fontWeight='bold' color='white'>G</Text>} />}
          name='Subjects with Grades'
          value={results === null ? '—' : String(gradedSubjects)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#FFB36D 0%,#FD7853 100%)' icon={<Icon as={MdStar} w='22px' h='22px' color='white' />} />}
          name='Highest Average Subject'
          value={bestSubject?.name || '—'}
        />
      </SimpleGrid>

      {latestExamResults.length > 0 ? (
        <>
          <Card p='16px' mb='16px'>
            <HStack justify='flex-end'>
              <Button size='sm' variant='outline' leftIcon={<Icon as={MdPrint} />} onClick={() => window.print()}>
                Print
              </Button>
              <Button size='sm' colorScheme='purple' leftIcon={<Icon as={MdFileDownload} />} onClick={exportCSV}>
                Export CSV
              </Button>
            </HStack>
          </Card>

          <Card p='0' mb='16px'>
            <Table size='sm' variant='striped' colorScheme='gray'>
              <Thead>
                <Tr><Th>Subject</Th><Th>Recorded Mark</Th><Th>Grade</Th></Tr>
              </Thead>
              <Tbody>
                {latestExamResults.map((result) => (
                  <Tr key={result.id}>
                    <Td>{result.subject}</Td>
                    <Td>{result.marks ?? '—'}</Td>
                    <Td>{result.grade ? <Badge colorScheme='purple'>{result.grade}</Badge> : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Card>

          <Card p='16px'>
            <Text fontSize='md' fontWeight='bold' mb='8px'>Average Recorded Mark by Subject</Text>
            <BarChart chartData={chartData} chartOptions={chartOptions} height={240} />
          </Card>
        </>
      ) : (
        <Card p='16px'>
          <Text color={textSecondary}>
            {results === null ? 'Loading grade records…' : 'No examination results have been recorded for your account.'}
          </Text>
        </Card>
      )}
    </Box>
  );
}
