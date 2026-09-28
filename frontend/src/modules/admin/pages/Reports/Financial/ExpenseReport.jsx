import React, { useCallback, useState } from 'react';
import {
    Alert, AlertIcon, Box, Flex, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useColorModeValue,
    Input, Heading, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid,
} from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';
import Card from '../../../../../components/card/Card';
import { reportsApi } from '../../../../../services/moduleApis';
import { useAuth } from '../../../../../contexts/AuthContext';
import useReportData from '../useReportData';
import ReportTableState from '../ReportTableState';

export default function ExpenseReport() {
    const { campusId } = useAuth();
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.financial.expense({ ...filters, campusId }),
        [filters, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));
    const totalExpense = data?.reduce((total, item) => total + Number(item.amount || 0), 0);

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Expense Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Start Date</Text><Input type='date' value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></Box>
                        <Box><Text mb='5px'>End Date</Text><Input type='date' value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap='20px' mb='20px'>
                    <Card p='20px'><Stat><StatLabel>Total Expenses</StatLabel><StatNumber>{totalExpense === undefined ? '—' : totalExpense.toLocaleString()}</StatNumber><StatHelpText>Selected Period</StatHelpText></Stat></Card>
                </SimpleGrid>
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th>Payee</Th><Th>Amount</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={5} emptyMessage='No expense records found for this period.' initialMessage='Expense data has not been loaded.' />
                            {!loading && !error && data?.map((item, index) => (
                                <Tr key={`${item.date}-${index}`}>
                                    <Td>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</Td>
                                    <Td>{item.category || '—'}</Td><Td>{item.description || '—'}</Td><Td>{item.payee || '—'}</Td>
                                    <Td fontWeight='bold' color='red.500'>{Number(item.amount || 0).toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
