import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Avatar,
  Box,
  Button,
  Center,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from '../../../../components/card/Card';
import usePolling from '../../../../hooks/usePolling';
import * as studentsApi from '../../../../services/api/students';

export default function StudentTransport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.800');
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const [student, setStudent] = useState(null);
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTransport = useCallback(async () => {
    try {
      if (!id || !Number.isInteger(Number(id))) {
        throw new Error('Invalid student identifier.');
      }
      const [studentRecord, transportRecord] = await Promise.all([
        studentsApi.getById(Number(id)),
        studentsApi.getTransport(Number(id)),
      ]);
      setStudent(studentRecord);
      setTransport(transportRecord || null);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load student transport details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  usePolling(loadTransport, 30000, Boolean(id));

  if (loading) {
    return <Center minH="50vh"><Spinner /></Center>;
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {error && (
        <Alert status="error" mb="16px">
          <AlertIcon />
          <Box flex="1">{error}</Box>
          <Button size="sm" onClick={loadTransport}>Retry</Button>
        </Alert>
      )}

      {student && !error && (
        <>
          <Card p="20px" mb="16px" bg={cardBg}>
            <Box display="flex" alignItems="center" gap="16px" flexWrap="wrap">
              <Avatar name={student.name} src={student.avatar || undefined} size="lg" />
              <Box flex="1">
                <Text fontSize="2xl" fontWeight="bold">{student.name}</Text>
                <Text color={secondaryText}>
                  {[
                    student.rollNumber,
                    student.class && `Class ${student.class}${student.section ? `-${student.section}` : ''}`,
                    student.status,
                  ].filter(Boolean).join(' • ') || 'Student details'}
                </Text>
              </Box>
              <Button colorScheme="blue" onClick={() => navigate('/admin/students/transport')}>
                Manage transport assignments
              </Button>
            </Box>
          </Card>

          {transport?.id ? (
            <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="16px">
              <Card p="18px">
                <Stat><StatLabel>Bus</StatLabel><StatNumber fontSize="lg">{transport.busNumber || '—'}</StatNumber></Stat>
              </Card>
              <Card p="18px">
                <Stat><StatLabel>Route</StatLabel><StatNumber fontSize="lg">{transport.routeName || '—'}</StatNumber></Stat>
              </Card>
              <Card p="18px">
                <Stat><StatLabel>Pickup stop</StatLabel><StatNumber fontSize="lg">{transport.pickupStopName || '—'}</StatNumber></Stat>
              </Card>
              <Card p="18px">
                <Stat><StatLabel>Drop-off stop</StatLabel><StatNumber fontSize="lg">{transport.dropStopName || '—'}</StatNumber></Stat>
              </Card>
            </SimpleGrid>
          ) : (
            <Card p="20px">
              <Text color={secondaryText}>No transport assignment is recorded for this student.</Text>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}
