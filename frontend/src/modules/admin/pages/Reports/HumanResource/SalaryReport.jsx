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

export default function SalaryReport() {
    const { campusId } = useAuth();
    const [month, setMonth] = useState('');
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.hr.salary({ month, campusId }),
        [month, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId && month));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Salary Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Month</Text><Input type='month' value={month} onChange={(e) => setMonth(e.target.value)} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading} isDisabled={!month}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Employee</Th><Th>Designation</Th><Th>Basic Salary</Th><Th>Deductions</Th><Th>Net Salary</Th><Th>Status</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={6} emptyMessage='No payroll records found for this month.' initialMessage={month ? 'Salary data has not been loaded.' : 'Choose a month to load payroll data.'} />
                            {!loading && !error && data?.map((item, index) => (
                                <Tr key={`${item.employeeName}-${index}`}>
                                    <Td>{item.employeeName}</Td><Td>{item.designation || '—'}</Td>
                                    <Td>{Number(item.basicSalary || 0).toLocaleString()}</Td><Td color='red.500'>{Number(item.deductions || 0).toLocaleString()}</Td>
                                    <Td fontWeight='bold'>{Number(item.netSalary || 0).toLocaleString()}</Td><Td><Badge>{item.status || '—'}</Badge></Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
