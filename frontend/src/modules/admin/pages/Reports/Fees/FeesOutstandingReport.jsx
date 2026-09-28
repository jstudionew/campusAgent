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

export default function FeesOutstandingReport() {
    const { campusId } = useAuth();
    const [filters, setFilters] = useState({ class: '' });
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.fees.outstanding({ ...filters, campusId }),
        [filters, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Outstanding Fees Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Class</Text><Input value={filters.class} placeholder='All classes' onChange={(e) => setFilters({ ...filters, class: e.target.value })} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Student Name</Th><Th>Class</Th><Th>Fee Type</Th><Th>Due Date</Th><Th>Amount Due</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={5} emptyMessage='No outstanding fee invoices found.' initialMessage='Outstanding fee data has not been loaded.' />
                            {!loading && !error && data?.map((item, index) => (
                                <Tr key={`${item.studentName}-${item.feeType}-${item.dueDate}-${index}`}>
                                    <Td>{item.studentName || '—'}</Td><Td>{item.className || '—'}</Td><Td>{item.feeType || '—'}</Td>
                                    <Td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</Td>
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
