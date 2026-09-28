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

export default function ExamGradesReport() {
    const { campusId } = useAuth();
    const [filters, setFilters] = useState({ classId: '', examId: '' });
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.examination.grades({ ...filters, campusId }),
        [filters, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Grade Analysis Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Class</Text><Input value={filters.classId} placeholder='All classes' onChange={(e) => setFilters({ ...filters, classId: e.target.value })} /></Box>
                        <Box><Text mb='5px'>Exam ID or title</Text><Input value={filters.examId} placeholder='All exams' onChange={(e) => setFilters({ ...filters, examId: e.target.value })} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Report</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Grade</Th><Th>Min Marks</Th><Th>Max Marks</Th><Th>Student Count</Th><Th>Percentage of Class</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={5} emptyMessage='No grade data found.' initialMessage='Grade data has not been loaded.' />
                            {!loading && !error && data?.map((item) => (
                                <Tr key={item.grade}>
                                    <Td fontWeight='bold' fontSize='lg'>{item.grade}</Td><Td>{item.minMarks}%</Td><Td>{item.maxMarks}%</Td>
                                    <Td>{item.count}</Td><Td>{item.percentage}%</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
