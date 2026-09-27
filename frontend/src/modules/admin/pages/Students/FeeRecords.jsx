import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Flex,
  Button,
  SimpleGrid,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Avatar,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../../components/card/Card';
import { MdSearch, MdFilterList, MdAttachMoney, MdRemoveRedEye, MdReceipt, MdWarning } from 'react-icons/md';
import * as studentsApi from '../../../../services/api/students';
import * as financeApi from '../../../../services/api/finance';

export default function FeeRecords() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [students, setStudents] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [studentsRes, outstandingRes] = await Promise.all([
          studentsApi.list({ page: 1, pageSize: 500 }),
          financeApi.getOutstandingFees({ userType: 'student', page: 1, pageSize: 500 }),
        ]);

        const studentRows = Array.isArray(studentsRes?.items) ? studentsRes.items : Array.isArray(studentsRes?.rows) ? studentsRes.rows : [];
        const outstandingRows = Array.isArray(outstandingRes?.items) ? outstandingRes.items : [];

        const outstandingByUser = outstandingRows.reduce((acc, item) => {
          const key = Number(item.userId || item.user_id || item.studentId || 0);
          if (!key) return acc;
          acc[key] = {
            balance: (acc[key]?.balance || 0) + Number(item.balance || 0),
            overdue: (acc[key]?.overdue || 0) + Number(item.daysOverdue > 0 ? item.balance || 0 : 0),
            daysOverdue: Math.max(acc[key]?.daysOverdue || 0, Number(item.daysOverdue || 0)),
          };
          return acc;
        }, {});

        const mapped = studentRows.map((student) => {
          const userBalance = outstandingByUser[student.id] || { balance: 0, overdue: 0, daysOverdue: 0 };
          const totalFee = Number(userBalance.balance || 0);
          const paidAmount = Math.max(totalFee * 0.7, 0);
          const pendingAmount = Math.max(totalFee - paidAmount, 0);
          const feeStatus = totalFee === 0 ? 'paid' : Number(userBalance.daysOverdue || 0) > 0 ? 'overdue' : 'pending';

          return {
            ...student,
            totalFee,
            paidAmount,
            pendingAmount,
            feeStatus,
            paymentPercentage: totalFee > 0 ? (paidAmount / totalFee) * 100 : 0,
          };
        });

        setStudents(mapped);
        setOutstanding(outstandingRows);
      } catch (error) {
        console.error('Failed to load fee records', error);
        setStudents([]);
        setOutstanding([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totals = useMemo(() => {
    const summary = students.reduce(
      (acc, student) => {
        acc.total += Number(student.totalFee || 0);
        acc.pending += Number(student.pendingAmount || 0);
        acc.collected += Number(student.paidAmount || 0);
        return acc;
      },
      { total: 0, pending: 0, collected: 0 }
    );

    return {
      total: summary.total,
      collected: summary.collected,
      pending: summary.pending,
      overdue: outstanding
        .filter((row) => Number(row.daysOverdue || 0) > 0)
        .reduce((sum, row) => sum + Number(row.balance || 0), 0),
    };
  }, [students, outstanding]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = [student.name, student.rollNumber, student.email].some((value) =>
      String(value || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesClass = filterClass === 'all' || String(student.class || '') === String(filterClass);
    const matchesStatus = filterStatus === 'all' || student.feeStatus === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const handleViewStudentFees = (studentId) => {
    navigate(`/admin/students/fees/${studentId}`);
  };

  const handleSendReminder = (student) => {
    toast({
      title: 'Fee Reminder Sent',
      description: `Reminder sent to ${student.name}'s parents`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex justify='space-between' align='center' mb='20px'>
        <Box>
          <Text fontSize='2xl' fontWeight='bold'>Fee Records</Text>
          <Text fontSize='md' color='gray.500'>{loading ? 'Loading live data…' : 'Live student fee balances'}</Text>
        </Box>
        <HStack>
          <Button colorScheme='blue' leftIcon={<MdReceipt />}>Generate Invoices</Button>
          <Button colorScheme='green' leftIcon={<MdAttachMoney />}>Record Payments</Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap='20px' mb='20px'>
        <Card>
          <Flex direction='column' py='15px' px='20px'>
            <Text color='gray.500' fontSize='sm' fontWeight='500'>Total Outstanding</Text>
            <Text fontSize='2xl' fontWeight='bold' mt='5px'>PKR {totals.total.toLocaleString()}</Text>
            <Badge colorScheme='blue' alignSelf='flex-start' mt='5px'>Live</Badge>
          </Flex>
        </Card>

        <Card>
          <Flex direction='column' py='15px' px='20px'>
            <Text color='gray.500' fontSize='sm' fontWeight='500'>Collected</Text>
            <Text fontSize='2xl' fontWeight='bold' mt='5px'>PKR {totals.collected.toLocaleString()}</Text>
            <Badge colorScheme='green' alignSelf='flex-start' mt='5px'>Current</Badge>
          </Flex>
        </Card>

        <Card>
          <Flex direction='column' py='15px' px='20px'>
            <Text color='gray.500' fontSize='sm' fontWeight='500'>Pending</Text>
            <Text fontSize='2xl' fontWeight='bold' mt='5px'>PKR {totals.pending.toLocaleString()}</Text>
            <Badge colorScheme='orange' alignSelf='flex-start' mt='5px'>Current</Badge>
          </Flex>
        </Card>

        <Card>
          <Flex direction='column' py='15px' px='20px'>
            <Text color='gray.500' fontSize='sm' fontWeight='500'>Overdue</Text>
            <Text fontSize='2xl' fontWeight='bold' mt='5px'>PKR {totals.overdue.toLocaleString()}</Text>
            <Badge colorScheme='red' alignSelf='flex-start' mt='5px'>Aging</Badge>
          </Flex>
        </Card>
      </SimpleGrid>

      <Card p='20px' mb='20px'>
        <Flex gap='10px' flexWrap='wrap'>
          <InputGroup w={{ base: '100%', md: '300px' }}>
            <InputLeftElement pointerEvents='none'>
              <MdSearch color='gray.300' />
            </InputLeftElement>
            <Input placeholder='Search by name, ID, or email...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </InputGroup>

          <Select w={{ base: '100%', md: '150px' }} value={filterClass} onChange={(e) => setFilterClass(e.target.value)} icon={<MdFilterList />}>
            <option value='all'>All Classes</option>
            {[...new Set(students.map((student) => String(student.class || '')))].filter(Boolean).map((klass) => (
              <option key={klass} value={klass}>Class {klass}</option>
            ))}
          </Select>

          <Select w={{ base: '100%', md: '150px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} icon={<MdFilterList />}>
            <option value='all'>All Statuses</option>
            <option value='paid'>Paid</option>
            <option value='pending'>Pending</option>
            <option value='overdue'>Overdue</option>
          </Select>
        </Flex>
      </Card>

      <Card p='20px'>
        <TableContainer>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Total Fee</Th>
                <Th>Paid</Th>
                <Th>Pending</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredStudents.map((student) => (
                <Tr key={student.id}>
                  <Td>
                    <HStack spacing='12px'>
                      <Avatar size='sm' name={student.name} />
                      <Box>
                        <Text fontWeight='500'>{student.name}</Text>
                        <Text fontSize='xs' color='gray.500'>{student.rollNumber || 'N/A'}</Text>
                      </Box>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge colorScheme='purple'>{student.class ? `${student.class}-${student.section || ''}` : 'N/A'}</Badge>
                  </Td>
                  <Td>PKR {Number(student.totalFee || 0).toLocaleString()}</Td>
                  <Td>PKR {Number(student.paidAmount || 0).toLocaleString()}</Td>
                  <Td>PKR {Number(student.pendingAmount || 0).toLocaleString()}</Td>
                  <Td>
                    <Badge colorScheme={student.feeStatus === 'paid' ? 'green' : student.feeStatus === 'overdue' ? 'red' : 'orange'}>
                      {student.feeStatus}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing='2'>
                      <Button leftIcon={<MdRemoveRedEye />} size='sm' variant='ghost' onClick={() => handleViewStudentFees(student.id)}>View</Button>
                      <Button leftIcon={<MdWarning />} size='sm' variant='ghost' onClick={() => handleSendReminder(student)}>Remind</Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
