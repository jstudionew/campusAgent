import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Center,
  HStack,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from '../../../components/card/Card';
import { useAuth } from '../../../contexts/AuthContext';
import usePolling from '../../../hooks/usePolling';
import * as studentsApi from '../../../services/api/students';

const PAGE_TITLES = {
  status: 'Fee Status',
  due: 'Due Fees',
  online: 'Online Payment',
  receipts: 'Payment History',
};

const formatCurrency = (amount) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
}).format(amount);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function StudentFeeRecords({ mode }) {
  const { user } = useAuth();
  const secondaryText = useColorModeValue('gray.600', 'gray.400');
  const [student, setStudent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      if (user?.role !== 'student') {
        throw new Error('Fee records are only available to the signed-in student.');
      }

      const studentResponse = await studentsApi.list({ pageSize: 1 });
      const currentStudent = studentResponse?.rows?.[0];
      if (!currentStudent?.id) {
        throw new Error('No student profile is linked to this account.');
      }

      const [feeResponse, paymentResponse] = await Promise.all([
        studentsApi.getFees(currentStudent.id),
        studentsApi.listFeePayments(currentStudent.id),
      ]);
      setStudent(currentStudent);
      setInvoices(Array.isArray(feeResponse?.invoices) ? feeResponse.invoices : []);
      setPayments(Array.isArray(paymentResponse?.items) ? paymentResponse.items : []);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load fee records.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  usePolling(loadRecords, 30000, user?.role === 'student');

  const invoiceRows = useMemo(() => invoices.map((invoice) => {
    const amount = Number(invoice.amount) || 0;
    const paid = Number(invoice.paid) || 0;
    const outstanding = Number(invoice.outstanding) || 0;
    const overdue = outstanding > 0 && invoice.dueDate && new Date(invoice.dueDate) < new Date();
    return {
      ...invoice,
      amount,
      paid,
      outstanding,
      status: outstanding <= 0 ? 'paid' : overdue ? 'overdue' : 'pending',
    };
  }), [invoices]);

  const visibleInvoices = mode === 'due'
    ? invoiceRows.filter((invoice) => invoice.outstanding > 0)
    : invoiceRows;
  const totalDue = invoiceRows.reduce((sum, invoice) => sum + invoice.outstanding, 0);
  const totalPaid = invoiceRows.reduce((sum, invoice) => sum + invoice.paid, 0);

  const exportPayments = () => {
    const rows = [
      'Payment ID,Invoice ID,Amount,Method,Paid On',
      ...payments.map((payment) => [
        payment.id,
        payment.invoiceId,
        payment.amount,
        payment.method || '',
        formatDate(payment.paidAt),
      ].join(',')),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'payment-history.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="bold" mb="6px">{PAGE_TITLES[mode]}</Text>
      <Text fontSize="md" color={secondaryText} mb="16px">
        {student ? `${student.name}${student.rollNumber ? ` • Roll ${student.rollNumber}` : ''}` : user?.name || ''}
      </Text>

      {error && (
        <Alert status="error" mb="16px">
          <AlertIcon />
          <Box flex="1">{error}</Box>
          <Button size="sm" onClick={loadRecords}>Retry</Button>
        </Alert>
      )}

      {mode === 'online' && (
        <Alert status="info" mb="16px">
          <AlertIcon />
          Online payment processing is not configured. No charge or payment record will be created here.
        </Alert>
      )}

      {mode === 'status' && !loading && !error && (
        <HStack spacing={6} mb="16px" flexWrap="wrap">
          <Text><strong>Outstanding:</strong> {invoiceRows.length ? formatCurrency(totalDue) : '—'}</Text>
          <Text><strong>Paid:</strong> {invoiceRows.length ? formatCurrency(totalPaid) : '—'}</Text>
        </HStack>
      )}

      <Card p="0">
        {loading ? (
          <Center p="8">
            <Spinner />
          </Center>
        ) : mode === 'receipts' ? (
          <Box overflowX="auto">
            <Table size="sm" variant="striped" colorScheme="gray">
              <Thead>
                <Tr><Th>Payment ID</Th><Th>Invoice</Th><Th>Amount</Th><Th>Method</Th><Th>Paid On</Th></Tr>
              </Thead>
              <Tbody>
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{payment.id}</Td>
                    <Td>{payment.invoiceId}</Td>
                    <Td>{formatCurrency(Number(payment.amount) || 0)}</Td>
                    <Td>{payment.method || '—'}</Td>
                    <Td>{formatDate(payment.paidAt)}</Td>
                  </Tr>
                ))}
                {!payments.length && !error && (
                  <Tr><Td colSpan={5}><Text color={secondaryText} py="4" textAlign="center">No payment records found.</Text></Td></Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="striped" colorScheme="gray">
              <Thead>
                <Tr><Th>Invoice</Th><Th>Issued</Th><Th>Due</Th><Th>Amount</Th><Th>Paid</Th><Th>Outstanding</Th><Th>Status</Th></Tr>
              </Thead>
              <Tbody>
                {visibleInvoices.map((invoice) => (
                  <Tr key={invoice.id}>
                    <Td>{invoice.id}</Td>
                    <Td>{formatDate(invoice.issuedAt)}</Td>
                    <Td>{formatDate(invoice.dueDate)}</Td>
                    <Td>{formatCurrency(invoice.amount)}</Td>
                    <Td>{formatCurrency(invoice.paid)}</Td>
                    <Td>{formatCurrency(invoice.outstanding)}</Td>
                    <Td>
                      <Badge colorScheme={invoice.status === 'paid' ? 'green' : invoice.status === 'overdue' ? 'red' : 'yellow'}>
                        {invoice.status}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {!visibleInvoices.length && !error && (
                  <Tr>
                    <Td colSpan={7}>
                      <Text color={secondaryText} py="4" textAlign="center">
                        {mode === 'due' ? 'No outstanding invoices.' : 'No fee invoices found.'}
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>

      {mode === 'receipts' && (
        <Button mt="4" size="sm" onClick={exportPayments} isDisabled={!payments.length}>
          Export payment history
        </Button>
      )}
    </Box>
  );
}
