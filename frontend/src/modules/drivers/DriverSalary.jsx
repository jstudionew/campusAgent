import React, { useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Center,
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
import Card from '../../components/card/Card';
import { useAuth } from '../../contexts/AuthContext';
import * as driversApi from '../../services/api/drivers';
import usePolling from '../../hooks/usePolling';

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString() : '—';
};

const formatPeriod = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export default function DriverSalary() {
  const { user } = useAuth();
  const border = useColorModeValue('gray.200', 'gray.600');
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePolling(async () => {
    try {
      const drivers = await driversApi.list({ page: 1, pageSize: 1 });
      const driver = drivers.items?.[0];
      if (!driver) {
        setPayroll([]);
        setError('No driver profile is linked to this account.');
        setLoading(false);
        return;
      }

      const response = await driversApi.payroll(driver.id, { page: 1, pageSize: 100 });
      setPayroll(response.items || []);
      setError('');
    } catch (err) {
      console.error('Failed to load driver payroll records', err);
      setError('Payroll records could not be loaded. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, 30000, user?.role === 'driver');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text fontSize="2xl" fontWeight="bold" mb="8px">Salary</Text>
      <Text fontSize="md" color="secondaryGray.600" mb="16px">
        Payroll records provided by your school administrator
      </Text>

      {error && (
        <Alert status="error" mb="16px" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Card p="16px">
        {loading ? (
          <Center py="12">
            <Spinner />
          </Center>
        ) : payroll.length === 0 ? (
          <Text color="secondaryGray.600">No payroll records are available.</Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Period</Th>
                  <Th isNumeric>Base salary</Th>
                  <Th isNumeric>Allowances</Th>
                  <Th isNumeric>Bonuses</Th>
                  <Th isNumeric>Deductions</Th>
                  <Th isNumeric>Total</Th>
                  <Th>Status</Th>
                  <Th>Paid on</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payroll.map((record) => (
                  <Tr key={record.id} borderColor={border}>
                    <Td>{formatPeriod(record.periodMonth)}</Td>
                    <Td isNumeric>{formatAmount(record.baseSalary)}</Td>
                    <Td isNumeric>{formatAmount(record.allowances)}</Td>
                    <Td isNumeric>{formatAmount(record.bonuses)}</Td>
                    <Td isNumeric>{formatAmount(record.deductions)}</Td>
                    <Td isNumeric fontWeight="semibold">{formatAmount(record.totalAmount)}</Td>
                    <Td textTransform="capitalize">{record.status || '—'}</Td>
                    <Td>{record.paidOn ? new Date(record.paidOn).toLocaleDateString() : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>
    </Box>
  );
}
