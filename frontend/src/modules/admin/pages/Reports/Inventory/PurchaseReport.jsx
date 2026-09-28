import React, { useCallback, useState } from 'react';
import {
    Alert, AlertIcon, Box, Flex, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useColorModeValue, Input, Heading, Badge,
} from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';
import Card from '../../../../../components/card/Card';
import { reportsApi } from '../../../../../services/moduleApis';
import { useAuth } from '../../../../../contexts/AuthContext';
import useReportData from '../useReportData';
import ReportTableState from '../ReportTableState';

export default function PurchaseReport() {
    const { campusId } = useAuth();
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.inventory.purchase({ ...filters, campusId }),
        [filters, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Purchase History Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Start Date</Text><Input type='date' value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} /></Box>
                        <Box><Text mb='5px'>End Date</Text><Input type='date' value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Purchases</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Date</Th><Th>Reference</Th><Th>Supplier</Th><Th>Total Items</Th><Th>Total Amount</Th><Th>Status</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={6} emptyMessage='No purchase records found for this period.' initialMessage='Purchase data has not been loaded.' />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.reference}>
                                    <Td>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</Td>
                                    <Td>{item.reference}</Td><Td>{item.supplier || '—'}</Td><Td>{item.items}</Td>
                                    <Td fontWeight='bold'>{Number(item.totalAmount || 0).toLocaleString()}</Td><Td><Badge>{item.status || '—'}</Badge></Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
