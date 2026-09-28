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

export default function StockReport() {
    const { campusId } = useAuth();
    const [category, setCategory] = useState('');
    const textColor = useColorModeValue('secondaryGray.900', 'white');
    const request = useCallback(
        () => reportsApi.inventory.stock({ category, campusId }),
        [category, campusId]
    );
    const { data, loading, error, refresh } = useReportData(request, Boolean(campusId));

    return (
        <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
            <Flex direction='column'>
                <Heading color={textColor} fontSize='2xl' mb='20px'>Inventory Stock Report</Heading>
                <Card p='20px' mb='20px'>
                    <Flex gap='20px' align='end' wrap='wrap'>
                        <Box><Text mb='5px'>Category</Text><Input value={category} placeholder='All categories' onChange={(e) => setCategory(e.target.value)} /></Box>
                        <Button colorScheme='brand' onClick={refresh} isLoading={loading}>Refresh Stock</Button>
                        <Button leftIcon={<MdPrint />} variant='outline' onClick={() => window.print()}>Print</Button>
                    </Flex>
                </Card>
                {!campusId && <Alert status='warning' mb='20px'><AlertIcon />Campus context is required to load this report.</Alert>}
                {error && <Alert status='error' mb='20px'><AlertIcon />{error}</Alert>}
                <Card p='20px'>
                    <Table variant='simple'>
                        <Thead><Tr><Th>Item Name</Th><Th>Category</Th><Th>Quantity</Th><Th>Unit Price</Th><Th>Total Value</Th></Tr></Thead>
                        <Tbody>
                            <ReportTableState data={data} loading={loading} error={error} colSpan={5} emptyMessage='No stock items found.' initialMessage='Stock data has not been loaded.' />
                            {!loading && !error && data?.map((item, index) => (
                                <Tr key={`${item.itemName}-${index}`}>
                                    <Td>{item.itemName}</Td><Td>{item.category || '—'}</Td><Td>{item.quantity}</Td>
                                    <Td>{Number(item.unitPrice || 0).toLocaleString()}</Td><Td fontWeight='bold'>{Number(item.totalValue || 0).toLocaleString()}</Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Flex>
        </Box>
    );
}
