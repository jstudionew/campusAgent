import React, { useCallback, useState } from 'react';
import {
    Alert, AlertIcon, Box, Flex, Button, Table, Thead, Tbody, Tr, Th, Td, Text, useColorModeValue, Input, Heading, Select, Badge,
} from '@chakra-ui/react';
import { MdPrint } from 'react-icons/md';
import Card from '../../../../../components/card/Card';
import { reportsApi } from '../../../../../services/moduleApis';
import { useAuth } from '../../../../../contexts/AuthContext';
import useReportData from '../useReportData';
import ReportTableState from '../ReportTableState';

const getLocalDate = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
};

export default function DailyAttendanceReport() {
    const { campusId } = useAuth();
    const [date, setDate] = useState(getLocalDate);
    const [type, setType] = useState('student');
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.attendance.daily({ date, type, campusId }),
        [date, type, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId && date));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Daily Attendance Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Type</Text><Select value={type} onChange={(e) => setType(e.target.value)}><option value='student'>Student</option><option value='staff'>Staff</option></Select></Box>
                        <Box><Text mb='5px'>Date</Text><Input type='date' value={date} onChange={(e) => setDate(e.target.value)} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Attendance</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>ID</Th><Th>Name</Th><Th>Check In</Th><Th>Check Out</Th><Th>Status</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={5} emptyMessage='No attendance records found for this date.' initialMessage='Attendance data has not been loaded.' />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.id}>
                                    <Td>{item.id}</Td><Td>{item.name}</Td><Td>{item.checkIn || '—'}</Td><Td>{item.checkOut || '—'}</Td>
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
