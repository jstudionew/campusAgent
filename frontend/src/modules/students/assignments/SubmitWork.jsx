import React, { useCallback, useMemo, useState } from 'react';
import { Alert, AlertIcon, Box, Center, Text, VStack, HStack, Select, Textarea, Table, Thead, Tbody, Tr, Th, Td, Badge, Button, Icon, Spinner, useColorModeValue, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, useDisclosure, Flex, useToast } from '@chakra-ui/react';
import { MdSend, MdPendingActions, MdCheckCircle, MdClass } from 'react-icons/md';
import Card from '../../../components/card/Card';
import MiniStatistics from '../../../components/card/MiniStatistics';
import IconBox from '../../../components/icons/IconBox';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';
import * as studentsApi from '../../../services/api/students';
import * as assignmentsApi from '../../../services/api/assignments';

export default function SubmitWork() {
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [student, setStudent] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      if (user?.role !== 'student') {
        throw new Error('Assignments are only available to the signed-in student.');
      }
      const studentPayload = await studentsApi.list({ pageSize: 1 });
      const currentStudent = studentPayload?.rows?.[0];
      if (!currentStudent?.id) {
        throw new Error('No student profile is linked to this account.');
      }
      const assignmentPayload = await assignmentsApi.list({ page: 1, pageSize: 200 });
      setStudent(currentStudent);
      setRows(Array.isArray(assignmentPayload?.rows) ? assignmentPayload.rows : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  usePolling(loadAssignments, 30000, user?.role === 'student');

  const classSection = `${student?.class || ''}${student?.section || ''}`;

  const pending = useMemo(() => (rows || []).filter((a) => !a.submissionId).map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject || a.class || '-',
    teacher: a.createdByName || '—',
    dueDate: a.dueDate ? String(a.dueDate).slice(0, 10) : '-',
    status: 'pending',
    description: a.description || '',
  })), [rows]);

  const submitted = useMemo(() => (rows || []).filter((a) => !!a.submissionId).map((a) => ({
    id: a.id,
    title: a.title,
    subject: a.subject || a.class || '-',
    teacher: a.createdByName || '—',
    dueDate: a.dueDate ? String(a.dueDate).slice(0, 10) : '-',
    status: 'submitted',
    description: a.description || '',
  })), [rows]);

  const subjects = useMemo(
    () => Array.from(new Set([...pending, ...submitted].map((a) => a.subject).filter(Boolean))),
    [pending, submitted]
  );

  const [subject, setSubject] = useState('all');
  const filteredPending = useMemo(() => pending.filter(a => subject === 'all' || a.subject === subject), [pending, subject]);

  const beginSubmit = (a) => { setSelected(a); setComment(''); onOpen(); };
  const doSubmit = async () => {
    if (!selected?.id || !comment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await assignmentsApi.submitWork(selected.id, { content: comment.trim() });
      toast({ title: 'Submitted', status: 'success', duration: 2500, isClosable: true });
      onClose();
      await loadAssignments();
    } catch (e) {
      toast({ title: 'Submit failed', description: e?.message || 'Request failed', status: 'error', duration: 3500, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize='2xl' fontWeight='bold' mb='6px'>Submit Work</Text>
      <Text fontSize='md' color={textSecondary} mb='16px'>
        {(student?.name || user?.name || '')}
        {student?.rollNumber ? ` • Roll ${student.rollNumber}` : ''}
        {classSection ? ` • Class ${classSection}` : ''}
      </Text>

      <Box mb='16px'>
        <Flex gap='16px' w='100%' wrap='nowrap'>
          <MiniStatistics
            compact
            startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#FFB36D 0%,#FD7853 100%)' icon={<Icon as={MdPendingActions} w='22px' h='22px' color='white' />} />}
            name='Pending'
            value={String(pending.length)}
            trendColor='#FD7853'
          />
          <MiniStatistics
            compact
            startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#4481EB 0%,#04BEFE 100%)' icon={<Icon as={MdCheckCircle} w='22px' h='22px' color='white' />} />}
            name='Submitted'
            value={String(submitted.length)}
            trendColor='#4481EB'
          />
          <MiniStatistics
            compact
            startContent={<IconBox w='44px' h='44px' bg='linear-gradient(90deg,#01B574 0%,#51CB97 100%)' icon={<Icon as={MdClass} w='22px' h='22px' color='white' />} />}
            name='Subjects'
            value={String(subjects.length)}
            trendColor='#01B574'
          />
        </Flex>
      </Box>

      <Card p='16px' mb='16px'>
        <HStack spacing={3} flexWrap='wrap' rowGap={3}>
          <Select size='sm' value={subject} onChange={e=>setSubject(e.target.value)} maxW='200px'>
            <option value='all'>All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </HStack>
      </Card>

      {error && (
        <Alert status='error' mb='16px'>
          <AlertIcon />
          <Box flex='1'>{error}</Box>
          <Button size='sm' onClick={loadAssignments}>Retry</Button>
        </Alert>
      )}

      <Card p='0' mb='16px'>
        <Table size='sm' variant='striped' colorScheme='gray'>
          <Thead><Tr><Th>Title</Th><Th>Subject</Th><Th>Teacher</Th><Th>Due</Th><Th>Status</Th><Th>Actions</Th></Tr></Thead>
          <Tbody>
            {loading && <Tr><Td colSpan={6}><Center py='4'><Spinner /></Center></Td></Tr>}
            {filteredPending.map(a => (
              <Tr key={a.id}>
                <Td>
                  <HStack spacing={2}>
                    <Text>{a.title}</Text>
                  </HStack>
                </Td>
                <Td>{a.subject}</Td>
                <Td>{a.teacher}</Td>
                <Td>{a.dueDate}</Td>
                <Td><Badge colorScheme='yellow'>{a.status}</Badge></Td>
                <Td>
                  <HStack>
                    <Button size='xs' leftIcon={<Icon as={MdSend} />} colorScheme='purple' onClick={()=>beginSubmit(a)}>Submit work</Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
            {!loading && !error && !filteredPending.length && (
              <Tr><Td colSpan={6}><Text color={textSecondary} py='4' textAlign='center'>No pending assignments.</Text></Td></Tr>
            )}
          </Tbody>
        </Table>
      </Card>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Submit: {selected?.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align='stretch' spacing={3}>
              <Text color={textSecondary}>
                File attachments are not supported. Submit your work as text below.
              </Text>
              <Textarea
                placeholder='Enter your assignment response'
                value={comment}
                onChange={e=>setComment(e.target.value)}
                isRequired
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme='purple' leftIcon={<Icon as={MdSend} />} onClick={doSubmit} isDisabled={!comment.trim() || submitting} isLoading={submitting}>Submit</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
