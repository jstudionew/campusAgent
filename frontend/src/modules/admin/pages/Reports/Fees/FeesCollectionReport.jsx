import React, { useCallback, useState } from 'react';
import {
    Alert, AlertIcon, Box, Flex, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useColorModeValue, Input, Heading,
} from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';
import Card from '../../../../../components/card/Card';
import { reportsApi } from '../../../../../services/moduleApis';
import { useAuth } from '../../../../../contexts/AuthContext';
import useReportData from '../useReportData';
import ReportTableState from '../ReportTableState';

export default function FeesCollectionReport() {
    const { campusId } = useAuth();
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.fees.collection({ ...filters, campusId }),
        [filters, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Fees Collection Report</Heading>
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
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Receipt No</Th><Th>Student Name</Th><Th>Class</Th><Th>Payment Date</Th><Th>Amount</Th><Th>Mode</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={6} emptyMessage='No student fee payments found for this period.' initialMessage='Fee collection data has not been loaded.' />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.receiptNo}>
                                    <Td>{item.receiptNo}</Td><Td>{item.studentName || '—'}</Td><Td>{item.className || '—'}</Td>
                                    <Td>{item.date ? new Date(item.date).toLocaleDateString() : '—'}</Td>
                                    <Td fontWeight='bold'>{Number(item.amount || 0).toLocaleString()}</Td><Td>{item.paymentMode || '—'}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
