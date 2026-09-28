import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Flex, Heading, Input, SimpleGrid, Table, Tbody,
  Td, Text, Th, Thead, Tr, useColorModeValue,
} from '@chakra-ui/react';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import usePolling from '../../../../hooks/usePolling';
import * as reportsApi from '../../../../services/api/reports';

const currency = (amount) => `Rs. ${Number(amount || 0).toLocaleString()}`;

export default function FeeCollection() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const headerBg = useColorModeValue('gray.50', 'gray.800');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { fromDate: fromDate || undefined, toDate: toDate || undefined };
      const [summaryResult, classResult] = await Promise.all([
        reportsApi.financeSummary(params),
        reportsApi.financeByClass(params),
      ]);
      setSummary({
        totalAmount: Number(summaryResult?.totalAmount || 0),
        paidTotal: Number(summaryResult?.paidTotal || 0),
        pendingAmount: Number(summaryResult?.pendingAmount || 0),
        overdueAmount: Number(summaryResult?.overdueAmount || 0),
      });
      const items = Array.isArray(classResult?.items) ? classResult.items : [];
      setRows(items.map((item) => ({
        className: String(item.class || 'Unknown'),
        billed: Number(item.billed || 0),
        collected: Number(item.collected || 0),
      })));
    } catch (requestError) {
      setRows([]);
      setSummary(null);
      setError(requestError?.data?.message || requestError?.message || 'Unable to load fee collection reports.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  usePolling(loadReport, 30000);

  const filteredRows = useMemo(() => rows.filter((row) =>
    row.className.toLowerCase().includes(search.trim().toLowerCase())
  ), [rows, search]);
  const collectionRate = summary?.totalAmount > 0
    ? Math.round(summary.paidTotal * 100 / summary.totalAmount)
    : null;
  const outstanding = summary ? summary.pendingAmount + summary.overdueAmount : null;

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading as="h3" size="lg" mb={1}>Fee Collection</Heading>
          <Text color="gray.500">Collections from recorded student fee invoices and payments</Text>
        </Box>
        <Button onClick={loadReport} isLoading={loading} variant="outline">Refresh</Button>
      </Flex>

      {error && <Alert status="error" mb={5}><AlertIcon />{error}</Alert>}

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <MiniStatistics name="Billed" value={summary ? currency(summary.totalAmount) : '—'} />
        <MiniStatistics name="Collected" value={summary ? currency(summary.paidTotal) : '—'} />
        <MiniStatistics name="Outstanding" value={summary ? currency(outstanding) : '—'} />
        <MiniStatistics name="Collection Rate" value={collectionRate === null ? '—' : `${collectionRate}%`} />
      </SimpleGrid>

      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <Input type="date" aria-label="From date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} maxW="220px" />
          <Input type="date" aria-label="To date" value={toDate} onChange={(e) => setToDate(e.target.value)} maxW="220px" />
          <Input placeholder="Search class" value={search} onChange={(e) => setSearch(e.target.value)} maxW="280px" />
          <Button colorScheme="blue" onClick={loadReport} isLoading={loading}>Apply filters</Button>
        </Flex>
      </Card>

      <Card>
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead bg={headerBg}>
              <Tr><Th>Class</Th><Th isNumeric>Billed</Th><Th isNumeric>Collected</Th><Th isNumeric>Outstanding</Th><Th isNumeric>Collection Rate</Th></Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={5} textAlign="center">Loading fee collection report…</Td></Tr>
              ) : filteredRows.length === 0 ? (
                <Tr><Td colSpan={5} textAlign="center">{error ? 'Fee collection data could not be loaded.' : 'No fee invoices found for this period.'}</Td></Tr>
              ) : filteredRows.map((row) => {
                const balance = Math.max(0, row.billed - row.collected);
                const rate = row.billed > 0 ? Math.round(row.collected * 100 / row.billed) : 0;
                return (
                  <Tr key={row.className}>
                    <Td fontWeight="600">{row.className}</Td>
                    <Td isNumeric>{currency(row.billed)}</Td>
                    <Td isNumeric>{currency(row.collected)}</Td>
                    <Td isNumeric>{currency(balance)}</Td>
                    <Td isNumeric>{rate}%</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
