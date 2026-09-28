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

export default function EmployeeReport() {
    const { campusId } = useAuth();
    const [department, setDepartment] = useState('');
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.hr.employee({ department, campusId }),
        [department, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Employee Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Department</Text><Input value={department} placeholder='All departments' onChange={(e) => setDepartment(e.target.value)} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>ID</Th><Th>Name</Th><Th>Role</Th><Th>Department</Th><Th>Join Date</Th><Th>Status</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={6} emptyMessage='No employee records found.' initialMessage='Employee data has not been loaded.' />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.id}>
                                    <Td>{item.id}</Td><Td>{item.name}</Td><Td>{item.role || '—'}</Td><Td>{item.department || '—'}</Td>
                                    <Td>{item.joinDate ? new Date(item.joinDate).toLocaleDateString() : '—'}</Td>
                                    <Td><Badge>{item.status || '—'}</Badge></Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
