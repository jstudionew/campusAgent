import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Select,
  Input,
  Button,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  Badge,
  useColorModeValue,
  Icon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  NumberInput,
  NumberInputField,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { MdRefresh, MdFileDownload, MdVisibility, MdEdit, MdSearch, MdSave, MdPeople, MdTrendingUp, MdBook } from 'react-icons/md';
import Card from '../../../components/card/Card';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import BarChart from '../../../components/charts/BarChart';
import PieChart from '../../../components/charts/PieChart';
import * as teachersApi from '../../../services/api/teachers';
import * as studentsApi from '../../../services/api/students';
import * as examsApi from '../../../services/api/exams';
import * as marksApi from '../../../services/api/marks';
import * as classesApi from '../../../services/api/classes';
import * as gradingApi from '../../../services/api/grading';

export default function UploadMarks() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [row, setRow] = useState(null);

  const [selectedClassKey, setSelectedClassKey] = useState('');
  const selectedClass = useMemo(() => {
    if (!selectedClassKey) return null;
    const [className, section] = selectedClassKey.split('::');
    return { className, section };
  }, [selectedClassKey]);

  const [subject, setSubject] = useState('');
  const [q, setQ] = useState('');

  const [gradingBands, setGradingBands] = useState(null);
  const [assignmentRows, setAssignmentRows] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);

  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [saving, setSaving] = useState(false);

  const [classSubjects, setClassSubjects] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const def = await gradingApi.getDefault();
        const bands = def?.bands || (Array.isArray(def?.items) ? (def.items[0]?.bands || {}) : {});
        if (mounted && bands && Object.keys(bands).length) setGradingBands(bands);
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingAssignments(true);
      try {
        const res = await teachersApi.listSubjectAssignments({});
        const rows = Array.isArray(res) ? res : Array.isArray(res?.rows) ? res.rows : [];
        if (!mounted) return;
        setAssignmentRows(rows);

        const classSet = new Set();
        rows.forEach((r) => {
          const classes = Array.isArray(r?.classes) ? r.classes : [];
          classes.forEach((c) => {
            if (typeof c !== 'string') return;
            const parsed = c.includes('::') ? c : (c.includes('-') ? c.replace('-', '::') : null);
            if (parsed && parsed.includes('::')) classSet.add(parsed);
          });
        });
        const classList = Array.from(classSet);
        if (!selectedClassKey && classList.length) setSelectedClassKey(classList[0]);
      } catch (e) {
        if (!mounted) return;
        setAssignmentRows([]);
      } finally {
        if (mounted) setLoadingAssignments(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClassKey]);

  const classOptions = useMemo(() => {
    const set = new Set();
    assignmentRows.forEach((r) => {
      const classes = Array.isArray(r?.classes) ? r.classes : [];
      classes.forEach((c) => {
        if (typeof c !== 'string') return;
        if (c.includes('::')) set.add(c);
        else if (/^\d+[A-Za-z]+$/.test(c)) {
          const match = c.match(/^(\d+)([A-Za-z]+)$/);
          if (match) set.add(`${match[1]}::${match[2]}`);
        } else if (c.includes('-')) {
          const parts = c.split('-').map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) set.add(`${parts[0]}::${parts.slice(1).join('-')}`);
        }
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [assignmentRows]);

  const subjectOptions = useMemo(() => {
    if (!selectedClassKey) return [];
    const set = new Set();
    assignmentRows.forEach((r) => {
      const subj = String(r?.subjectName || '').trim();
      if (!subj) return;
      const classes = Array.isArray(r?.classes) ? r.classes : [];
      const ok = classes.some((c) => {
        if (typeof c !== 'string') return false;
        if (c === selectedClassKey) return true;
        if (/^\d+[A-Za-z]+$/.test(c)) {
          const match = c.match(/^(\d+)([A-Za-z]+)$/);
          return match ? `${match[1]}::${match[2]}` === selectedClassKey : false;
        }
        if (c.includes('-')) {
          const parts = c.split('-').map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) return `${parts[0]}::${parts.slice(1).join('-')}` === selectedClassKey;
        }
        return false;
      });
      if (ok) set.add(subj);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assignmentRows, selectedClassKey]);

  useEffect(() => {
    if (!subject && subjectOptions.length) setSubject(subjectOptions[0]);
    if (subject && subjectOptions.length && !subjectOptions.includes(subject)) setSubject(subjectOptions[0] || '');
  }, [subjectOptions, subject]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedClass?.className || !selectedClass?.section) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await studentsApi.list({ page: 1, pageSize: 200, class: selectedClass.className, section: selectedClass.section });
        const list = Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : [];
        if (mounted) setStudents(list);
      } catch (_) {
        if (mounted) setStudents([]);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClass]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedClass?.className || !selectedClass?.section) {
        setExams([]);
        setExamId('');
        return;
      }
      setLoadingExams(true);
      try {
        const res = await examsApi.list({ page: 1, pageSize: 200, className: selectedClass.className, section: selectedClass.section });
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (!mounted) return;
        setExams(items);
        if (!examId && items.length) setExamId(String(items[0].id));
      } catch (_) {
        if (!mounted) return;
        setExams([]);
        setExamId('');
      } finally {
        if (mounted) setLoadingExams(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClass, examId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedClass?.className || !selectedClass?.section) {
        setClassSubjects([]);
        return;
      }
      try {
        const res = await classesApi.listSubjectsByClass({ className: selectedClass.className, section: selectedClass.section });
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        if (mounted) setClassSubjects(items);
      } catch (_) {
        if (mounted) setClassSubjects([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedClass]);

  const fullMarks = useMemo(() => {
    const found = (classSubjects || []).find((s) => String(s?.subjectName || '').trim().toLowerCase() === String(subject || '').trim().toLowerCase());
    const n = found?.fullMarks;
    const v = Number(n);
    return Number.isFinite(v) ? v : null;
  }, [classSubjects, subject]);

  const computeGradeByBands = (bands, percent) => {
    const entries = Object.entries(bands || {})
      .map(([k, v]) => [k, Number(v) || 0])
      .sort((a, b) => b[1] - a[1]);
    for (const [g, min] of entries) {
      if (Number(percent) >= min) return String(g);
    }
    return 'F';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!examId || !selectedClass?.className || !selectedClass?.section || !subject) {
        setEntries([]);
        return;
      }
      setLoadingEntries(true);
      try {
        const res = await marksApi.entries({ examId: Number(examId), className: selectedClass.className, section: selectedClass.section, subject });
        const list = Array.isArray(res?.rows) ? res.rows : [];
        if (!mounted) return;
        const mapped = list.map((r) => {
          const marks = r.marks === undefined || r.marks === null || r.marks === '' ? null : Number(r.marks);
          return {
            studentId: r.studentId,
            name: r.studentName,
            roll: r.rollNumber,
            cls: r.className,
            section: r.section,
            marks: Number.isFinite(marks) ? marks : null,
            grade: r.grade || '',
          };
        });
        setEntries(mapped);
      } catch (e) {
        if (!mounted) return;
        setEntries([]);
        toast({ title: 'Failed to load marks', description: e?.message, status: 'error', duration: 4000 });
      } finally {
        if (mounted) setLoadingEntries(false);
      }
    })();
    return () => { mounted = false; };
  }, [examId, selectedClass, subject, toast]);

  const filtered = useMemo(() => entries.filter(r =>
    (!q || String(r.name || '').toLowerCase().includes(q.toLowerCase()) || String(r.roll || '').toLowerCase().includes(q.toLowerCase()))
  ), [entries, q]);

  const totals = useMemo(() => ({
    count: filtered.length,
    avg: filtered.length ? Math.round(filtered.reduce((a,r)=>a+r.marks,0)/filtered.length) : 0,
  }), [filtered]);

  const chartData = useMemo(() => ([{ name: 'Marks', data: filtered.slice(0,8).map(r=>Number(r.marks || 0)) }]), [filtered]);
  const chartOptions = useMemo(() => ({
    chart: { toolbar: { show: false } },
    xaxis: { categories: filtered.slice(0,8).map(r=> r.name.split(' ')[0]) },
    dataLabels: { enabled: false },
    colors: ['#3182CE'],
  }), [filtered]);

  const gradeBuckets = useMemo(() => {
    const buckets = { '≥85': 0, '70-84': 0, '<70': 0 };
    filtered.forEach(r => {
      if (r.marks >= 85) buckets['≥85'] += 1;
      else if (r.marks >= 70) buckets['70-84'] += 1;
      else buckets['<70'] += 1;
    });
    return { labels: Object.keys(buckets), values: Object.values(buckets) };
  }, [filtered]);

  const exportCSV = () => {
    const header = ['Student','Roll','Class','Section','Subject','Marks'];
    const data = filtered.map(r => [r.name, r.roll, r.cls, r.section, subject, r.marks ?? '']);
    const csv = [header, ...data].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'upload_marks.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const handleSaveAll = async () => {
    if (!examId || !subject) return;
    setSaving(true);
    try {
      const items = filtered.map((r) => {
        const marks = r.marks === '' || r.marks === undefined ? null : (r.marks === null ? null : Number(r.marks));
        let grade = r.grade || null;
        if (!grade && marks != null && Number.isFinite(marks) && fullMarks && gradingBands) {
          const pct = (marks / fullMarks) * 100;
          grade = computeGradeByBands(gradingBands, pct);
        }
        return { studentId: Number(r.studentId), subject, marks: marks == null ? null : Number(marks), grade };
      });

      const res = await marksApi.bulkUpsert({ examId: Number(examId), items });
      const rejected = Array.isArray(res?.rejected) ? res.rejected : [];
      if (rejected.length) {
        toast({ title: 'Some rows were rejected', description: `${rejected.length} entries not allowed`, status: 'warning', duration: 5000 });
      } else {
        toast({ title: 'Saved', status: 'success', duration: 2500 });
      }
    } catch (e) {
      toast({ title: 'Save failed', description: e?.message, status: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Upload Marks</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>Enter and update marks</Text>

      <Box mb='16px'>
        <Flex gap='16px' w='100%' wrap='nowrap'>
          <MiniStatistics compact startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<MdPeople color='white' />} />} name='Students' value={String(totals.count)} trendData={[10,12,14,13,15,16]} trendColor='#4481EB' />
          <MiniStatistics compact startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<MdTrendingUp color='white' />} />} name='Average' value={String(totals.avg)} trendData={[70,72,74,76,78,80]} trendColor='#01B574' />
          <MiniStatistics compact startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#B721FF 0%,#21D4FD 100%)' icon={<MdBook color='white' />} />} name='Subject' value={String(subject)} trendData={[1,1,1,1,1,1]} trendColor='#B721FF' />
        </Flex>
      </Box>

      <Card p='16px' mb='16px'>
        <Flex gap={3} flexWrap='wrap' justify='space-between' align='center'>
          <HStack spacing={3} flexWrap='wrap' rowGap={3}>
            <Select
              placeholder={loadingAssignments ? 'Loading classes...' : 'Class'}
              value={selectedClassKey}
              onChange={(e) => setSelectedClassKey(e.target.value)}
              size='sm'
              maxW='180px'
              isDisabled={loadingAssignments}
            >
              {classOptions.map((c) => {
                const [cn, sec] = c.split('::');
                return <option key={c} value={c}>{cn}-{sec}</option>;
              })}
            </Select>
            <Select
              placeholder='Subject'
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              size='sm'
              maxW='200px'
              isDisabled={!selectedClassKey}
            >
              {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select
              placeholder={loadingExams ? 'Loading exams...' : 'Exam'}
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              size='sm'
              maxW='220px'
              isDisabled={loadingExams || !selectedClassKey}
            >
              {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
            <HStack>
              <Input placeholder='Search student/roll' value={q} onChange={e=>setQ(e.target.value)} size='sm' maxW='220px' />
              <IconButton aria-label='Search' icon={<MdSearch />} size='sm' />
            </HStack>
          </HStack>
          <HStack>
            <Button size='sm' variant='outline' leftIcon={<Icon as={MdRefresh}/>} onClick={()=>{setSelectedClassKey('');setSubject('');setExamId('');setQ('');setEntries([]);}}>Reset</Button>
            <Button size='sm' colorScheme='blue' leftIcon={<Icon as={MdFileDownload}/>} onClick={exportCSV}>Export CSV</Button>
            <Button size='sm' colorScheme='green' leftIcon={<Icon as={MdSave}/>} onClick={handleSaveAll} isLoading={saving} loadingText='Saving'>Save</Button>
          </HStack>
        </Flex>
      </Card>

      <Card p='0' mb='16px'>
        <Box overflowX='auto'>
          <Box minW='880px'>
            <Table size='sm' variant='striped' colorScheme='gray'>
              <Thead position='sticky' top={0} bg={headerBg} zIndex={1} boxShadow='sm'>
                <Tr>
                  <Th>Student</Th>
                  <Th>Roll</Th>
                  <Th>Class</Th>
                  <Th isNumeric>Marks</Th>
                  <Th textAlign='right'>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loadingEntries && (
                  <Tr>
                    <Td colSpan={5}>
                      <Flex align='center' justify='center' py={6}>
                        <Spinner size='sm' mr={3} />
                        <Text>Loading marks...</Text>
                      </Flex>
                    </Td>
                  </Tr>
                )}
                {filtered.map(r => (
                  <Tr key={r.studentId} _hover={{ bg: hoverBg }}>
                    <Td><Tooltip label={r.name}><Box isTruncated maxW='220px'>{r.name}</Box></Tooltip></Td>
                    <Td>{r.roll}</Td>
                    <Td>{r.cls}-{r.section}</Td>
                    <Td isNumeric>
                      <NumberInput
                        size='sm'
                        maxW='110px'
                        value={r.marks ?? ''}
                        min={0}
                        max={fullMarks ?? 999}
                        onChange={(val) => {
                          const next = val === '' ? null : Number(val);
                          setEntries((prev) => prev.map((x) => x.studentId === r.studentId ? ({ ...x, marks: Number.isFinite(next) ? next : null }) : x));
                        }}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </Td>
                    <Td>
                      <HStack justify='flex-end'>
                        <Tooltip label='View'>
                          <IconButton aria-label='View' icon={<MdVisibility/>} size='sm' variant='ghost' onClick={()=>{setRow(r); onOpen();}} />
                        </Tooltip>
                        <Tooltip label='Edit'>
                          <IconButton aria-label='Edit' icon={<MdEdit/>} size='sm' variant='ghost' onClick={()=>{setRow(r); onOpen();}} />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Card>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <Card p='16px'>
          <Text fontWeight='700' mb='8px'>Marks (Top 8)</Text>
          <BarChart chartData={chartData} chartOptions={chartOptions} height={220} />
        </Card>
        <Card p='16px'>
          <Text fontWeight='700' mb='8px'>Grade Distribution</Text>
          <PieChart height={240} chartData={gradeBuckets.values} chartOptions={{ labels: gradeBuckets.labels, legend:{ position:'right' } }} />
        </Card>
      </SimpleGrid>

      <Modal isOpen={isOpen} onClose={onClose} size='md' isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Marks</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {row && (
              <VStack align='start' spacing={3} fontSize='sm'>
                <HStack><Text fontWeight='600'>Student:</Text><Text>{row.name} ({row.roll})</Text></HStack>
                <HStack><Text fontWeight='600'>Class:</Text><Text>{row.cls}-{row.section}</Text></HStack>
                <HStack>
                  <Text fontWeight='600'>Marks:</Text>
                  <NumberInput
                    size='sm'
                    maxW='120px'
                    value={row.marks ?? ''}
                    min={0}
                    max={fullMarks ?? 999}
                    onChange={(val) => {
                      const next = val === '' ? null : Number(val);
                      setEntries((prev) => prev.map((x) => x.studentId === row.studentId ? ({ ...x, marks: Number.isFinite(next) ? next : null }) : x));
                      setRow((prev) => prev ? ({ ...prev, marks: Number.isFinite(next) ? next : null }) : prev);
                    }}
                  >
                    <NumberInputField />
                  </NumberInput>
                </HStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Close</Button>
            <Button colorScheme='blue' leftIcon={<MdSave/>} onClick={onClose}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
