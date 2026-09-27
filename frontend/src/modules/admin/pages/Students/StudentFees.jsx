import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Flex,
  Button,
  SimpleGrid,
  Badge,
  Avatar,
  HStack,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useToast,
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import Card from '../../../../components/card/Card';
import StatCard from '../../../../components/card/StatCard';
import { MdAttachMoney, MdCheckCircle, MdAccessTime, MdWarning, MdPayment, MdReceipt } from 'react-icons/md';
import * as studentsApi from '../../../../services/api/students';

export default function StudentFees() {
  const { id } = useParams();
  const toast = useToast();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState({
    invoices: [],
    totals: { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, overdueOutstanding: 0, overdueCount: 0 },
  });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [studentRes, feesRes, paymentsRes] = await Promise.all([
          studentsApi.getById(id),
          studentsApi.getFees(id),
          studentsApi.listFeePayments(id),
        ]);

        setStudent(studentRes || null);
        setFees(
          feesRes || {
            invoices: [],
            totals: { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, overdueOutstanding: 0, overdueCount: 0 },
          }
        );
        setPayments(Array.isArray(paymentsRes) ? paymentsRes : Array.isArray(paymentsRes?.items) ? paymentsRes.items : []);
      } catch (error) {
        console.error('Failed to load student fee details', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const totals = useMemo(() => {
    const totalFee = Number(fees.totals?.totalInvoiced || 0);
    const paidAmount = Number(fees.totals?.totalPaid || 0);
    const pendingAmount = Number(fees.totals?.totalOutstanding || 0);
    const overdueAmount = Number(fees.totals?.overdueOutstanding || 0);

    return {
      totalFee,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paymentPercentage: totalFee > 0 ? (paidAmount / totalFee) * 100 : 0,
    };
  }, [fees]);

  const handleMakePayment = () => {
    toast({
      title: 'Payment feature',
      description: 'Use the invoice/payment API to record a payment from the finance module.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  if (loading) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }} display='flex' justifyContent='center' alignItems='center' minH='320px'>
        <Spinner size='xl' />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
        <Text fontSize='xl' fontWeight='bold'>Student not found</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex justify='space-between' align='center' mb='20px'>
        <HStack spacing='20px'>
          <Avatar size='xl' name={student.name} />
          <Box>
            <Text fontSize='2xl' fontWeight='bold'>{student.name}</Text>
            <Flex align='center' mt='5px'>
              <Text fontSize='md' color='gray.600' mr='10px'>{student.rollNumber || 'N/A'}</Text>
              <Badge colorScheme='purple' mr='10px'>Class {student.class || 'N/A'}-{student.section || ''}</Badge>
              <Badge colorScheme='green'>Active</Badge>
            </Flex>
            <Text fontSize='sm' color='gray.500' mt='5px'>{student.email || 'No email provided'}</Text>
          </Box>
        </HStack>

        <HStack spacing='10px'>
          <Button leftIcon={<MdPayment />} colorScheme='blue' onClick={handleMakePayment}>Make Payment</Button>
          <Button leftIcon={<MdReceipt />} variant='outline'>Download Fee Card</Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap='20px' mb='20px'>
        <StatCard title='Total Fee' value={`PKR ${totals.totalFee.toLocaleString()}`} icon={MdAttachMoney} colorScheme='blue' />
        <StatCard title='Paid Amount' value={`PKR ${totals.paidAmount.toLocaleString()}`} icon={MdCheckCircle} colorScheme='green' subValue={`${totals.paymentPercentage.toFixed(1)}%`} />
        <StatCard title='Pending Amount' value={`PKR ${totals.pendingAmount.toLocaleString()}`} icon={MdAccessTime} colorScheme='orange' note='Current balance' />
        <StatCard title='Overdue Amount' value={`PKR ${totals.overdueAmount.toLocaleString()}`} icon={MdWarning} colorScheme='red' note='Aging balance' />
      </SimpleGrid>

      <Card p='20px' mb='20px'>
        <Text fontSize='lg' fontWeight='bold' mb='20px'>Invoice Ledger</Text>
        <Accordion allowMultiple defaultIndex={[0]}>
          {(fees.invoices || []).map((invoice, index) => (
            <AccordionItem key={invoice.id || index} border='1px' borderColor='gray.200' borderRadius='md' mb='10px'>
              <h2>
                <AccordionButton p='15px'>
                  <Box flex='1' textAlign='left' fontWeight='500'>{invoice.description || 'Fee Invoice'}</Box>
                  <HStack spacing='15px'>
                    <Text fontWeight='bold'>PKR {Number(invoice.amount || 0).toLocaleString()}</Text>
                    <Badge colorScheme={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'orange'}>
                      {String(invoice.status || 'pending').toUpperCase()}
                    </Badge>
                    <AccordionIcon />
                  </HStack>
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4} bg='gray.50'>
                <Text mb='2'>Due date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}</Text>
                <Text mb='2'>Issued: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : 'N/A'}</Text>
                <Text mb='4'>
                  Paid: PKR {Number(invoice.paid || 0).toLocaleString()} | Outstanding: PKR{' '}
                  {Number(Math.max((invoice.amount || 0) - (invoice.paid || 0), 0)).toLocaleString()}
                </Text>
                <TableContainer>
                  <Table size='sm' variant='simple'>
                    <Thead>
                      <Tr>
                        <Th>Payment Date</Th>
                        <Th>Method</Th>
                        <Th>Amount</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(payments.filter((payment) => String(payment.invoiceId || payment.invoice_id) === String(invoice.id))).length > 0 ? (
                        payments
                          .filter((payment) => String(payment.invoiceId || payment.invoice_id) === String(invoice.id))
                          .map((payment, idx) => (
                            <Tr key={`${invoice.id}-${idx}`}>
                              <Td>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}</Td>
                              <Td>{payment.method || 'Cash'}</Td>
                              <Td>PKR {Number(payment.amount || 0).toLocaleString()}</Td>
                            </Tr>
                          ))
                      ) : (
                        <Tr>
                          <Td colSpan={3}>No payments recorded for this invoice.</Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </TableContainer>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card p='20px' mb='20px'>
        <Text fontSize='lg' fontWeight='bold' mb='20px'>Payment History</Text>
        <TableContainer>
          <Table variant='simple'>
            <Thead>
              <Tr>
                <Th>Receipt</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {payments.length > 0 ? (
                payments.map((payment, idx) => (
                  <Tr key={payment.id || idx}>
                    <Td>{payment.referenceNumber || payment.invoiceNumber || `INV-${payment.id}`}</Td>
                    <Td>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'N/A'}</Td>
                    <Td>PKR {Number(payment.amount || 0).toLocaleString()}</Td>
                    <Td>{payment.method || 'Cash'}</Td>
                    <Td>
                      <Badge colorScheme='green'>Completed</Badge>
                    </Td>
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={5}>No payment history available.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}

