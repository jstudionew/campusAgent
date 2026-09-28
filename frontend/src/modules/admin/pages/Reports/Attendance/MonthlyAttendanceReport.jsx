import React, { useCallback, useState } from 'react';
import {
    Alert, AlertIcon, Box, Flex, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useColorModeValue, Input, Heading, Select,
} from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';
import Card from '../../../../../components/card/Card';
import { reportsApi } from '../../../../../services/moduleApis';
import { useAuth } from '../../../../../contexts/AuthContext';
import useReportData from '../useReportData';
import ReportTableState from '../ReportTableState';

export default function MonthlyAttendanceReport() {
    const { campusId } = useAuth();
    const [month, setMonth] = useState('');
    const [type, setType] = useState('student');
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.attendance.monthly({ month, type, campusId }),
        [month, type, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId && month));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Monthly Attendance Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Type</Text><Select value={type} onChange={(e) => setType(e.target.value)}><option value='student'>Student</option><option value='staff'>Staff</option></Select></Box>
                        <Box><Text mb='5px'>Select Month</Text><Input type='month' value={month} onChange={(e) => setMonth(e.target.value)} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading} isDisabled={!month}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>ID</Th><Th>Name</Th><Th>Total Days</Th><Th>Present</Th><Th>Absent</Th><Th>Late</Th><Th>Percentage</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={7} emptyMessage='No attendance records found for this month.' initialMessage={month ? 'Attendance data has not been loaded.' : 'Choose a month to load attendance data.'} />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.id}>
                                    <Td>{item.id}</Td><Td>{item.name}</Td><Td>{item.totalDays}</Td><Td color='green.500'>{item.present}</Td>
                                    <Td color='red.500'>{item.absent}</Td><Td color='orange.500'>{item.late}</Td><Td fontWeight='bold'>{item.percentage}%</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
