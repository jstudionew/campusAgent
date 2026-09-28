import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, HStack, Icon, Select, SimpleGrid, Table, Tbody, Td, Text, Th, Thead, Tr, useColorModeValue } from '@chakra-ui/react';
import { MdDateRange, MdFileDownload, MdPrint, MdSchedule } from 'react-icons/md';
import Card from '../../../components/card/Card';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import * as examsApi from '../../../services/api/exams';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ExamTimetable() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('white', 'gray.800');
  const { user } = useAuth();
  const [exams, setExams] = useState(null);
  const [subject, setSubject] = useState('all');

  usePolling(async () => {
    try {
      const response = await examsApi.list({
        page: 1,
        pageSize: 200,
        fromDate: toLocalDateString(new Date()),
      });
      setExams(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      console.error('Failed to refresh student examination schedule', error);
    }
  }, 30000, user?.role === 'student');

  const subjects = useMemo(
    () => Array.from(new Set((exams || []).map((exam) => exam.subject).filter(Boolean))),
    [exams]
  );
  const filteredExams = useMemo(
    () => (exams || []).filter((exam) => subject === 'all' || exam.subject === subject),
    [exams, subject]
  );
  const examsThisWeek = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return filteredExams.filter((exam) => {
      if (!exam.examDate) return false;
      const examDate = new Date(`${exam.examDate.slice(0, 10)}T00:00:00`);
      return examDate >= now && examDate <= weekEnd;
    }).length;
  }, [filteredExams]);

  const exportCSV = () => {
    const header = ['Exam', 'Subject', 'Date', 'Class', 'Section', 'Status'];
    const rows = filteredExams.map((exam) => [
      exam.title,
      exam.subject,
      exam.examDate,
      exam.class,
      exam.section,
      exam.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_exam_timetable.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const nextExam = exams?.find((exam) => exam.examDate);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Exam Timetable</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>Upcoming exams recorded for your class.</Text>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing='16px' mb='16px'>
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#805AD5 0%,#D53F8C 100%)' icon={<Icon as={MdSchedule} w='22px' h='22px' color='white' />} />}
          name='Upcoming Exams'
          value={exams === null ? '—' : String(exams.length)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<Icon as={MdDateRange} w='22px' h='22px' color='white' />} />}
          name='Exams in the Next 7 Days'
          value={exams === null ? '—' : String(examsThisWeek)}
        />
        <MiniStatistics
          compact
          startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<Icon as={MdDateRange} w='22px' h='22px' color='white' />} />}
          name='Next Exam'
          value={exams === null ? '—' : nextExam?.examDate ? new Date(`${nextExam.examDate.slice(0, 10)}T00:00:00`).toLocaleDateString() : 'Not scheduled'}
        />
      </SimpleGrid>

      <Card p='16px' mb='16px'>
        <HStack justify='space-between' flexWrap='wrap' rowGap={3}>
          <Select size='sm' value={subject} onChange={(event) => setSubject(event.target.value)} maxW='260px'>
            <option value='all'>All Subjects</option>
            {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <HStack>
            <Button size='sm' variant='outline' leftIcon={<Icon as={MdPrint} />} onClick={() => window.print()}>
              Print
            </Button>
            <Button size='sm' colorScheme='purple' leftIcon={<Icon as={MdFileDownload} />} onClick={exportCSV} isDisabled={!filteredExams.length}>
              Export CSV
            </Button>
          </HStack>
        </HStack>
      </Card>

      <Card p='0'>
        <Box overflowX='auto'>
          <Table size='sm' variant='striped' colorScheme='gray'>
            <Thead bg={headerBg} position='sticky' top={0} zIndex={1} boxShadow='sm'>
              <Tr>
                <Th>Exam</Th>
                <Th>Subject</Th>
                <Th>Date</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredExams.map((exam) => (
                <Tr key={exam.id}>
                  <Td>{exam.title}</Td>
                  <Td>{exam.subject || '—'}</Td>
                  <Td>{exam.examDate ? new Date(`${exam.examDate.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'}</Td>
                  <Td>{exam.class || '—'}</Td>
                  <Td>{exam.section || '—'}</Td>
                  <Td>{exam.status ? <Badge colorScheme='blue'>{exam.status}</Badge> : '—'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {filteredExams.length === 0 && (
            <Text color={textSecondary} fontSize='sm' p='4'>
              {exams === null ? 'Loading examination schedule…' : 'No upcoming exams are recorded for your class.'}
            </Text>
          )}
        </Box>
      </Card>
    </Box>
  );
}
