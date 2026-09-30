import React, { useState, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Icon, Badge, Button, ButtonGroup,
  useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Select, Input,
  InputGroup, InputLeftElement, Spinner, useToast
} from '@chakra-ui/react';
import { MdReceipt, MdSearch, MdFileDownload, MdPrint } from 'react-icons/md';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import IconBox from '../../../../components/icons/IconBox';
import { UserTypeFilter } from './components/UserTypeSelector';
import NoUsersWarning from './components/NoUsersWarning';
import { useFinanceUsers, useReceipts } from '../../../../hooks/useFinanceUsers';
import { financeApi } from '../../../../services/financeApi';
import { useAuth } from '../../../../contexts/AuthContext';
import { downloadCsv, escapeHtml, loadCampusForExport, openCampusPrintDocument } from '../../../../utils/campusExports';

export default function Receipts() {
  const toast = useToast();
  const { campusId } = useAuth();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');

  // State
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Hooks
  const { loading: usersLoading, hasUsers, counts } = useFinanceUsers();
  const {
    loading: receiptsLoading,
    receipts,
    refresh: refreshReceipts
  } = useReceipts({
    userType: roleFilter !== 'all' ? roleFilter : undefined,
    page,
    pageSize
  });

  const loading = usersLoading || receiptsLoading;

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return receipts;
    const s = search.toLowerCase();
    return receipts.filter(r =>
      r.receiptNumber?.toLowerCase().includes(s) ||
      r.userName?.toLowerCase().includes(s) ||
      r.invoiceNumber?.toLowerCase().includes(s)
    );
  }, [receipts, search]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
    const students = filtered.filter(r => r.userType === 'student').length;
    const teachers = filtered.filter(r => r.userType === 'teacher').length;
    const drivers = filtered.filter(r => r.userType === 'driver').length;
    return { total, count: filtered.length, students, teachers, drivers };
  }, [filtered]);

  const exportCSV = async () => {
    try {
      const exported = [];
      let pageNumber = 1;
      while (true) {
        const response = await financeApi.listReceipts({ userType: roleFilter !== 'all' ? roleFilter : undefined, page: pageNumber, pageSize: 200 });
        const rows = Array.isArray(response?.items) ? response.items : [];
        exported.push(...rows);
        if (rows.length < 200) break;
        pageNumber += 1;
      }
      const term = search.trim().toLowerCase();
      const exportRows = term ? exported.filter((receipt) => receipt.receiptNumber?.toLowerCase().includes(term) || receipt.invoiceNumber?.toLowerCase().includes(term) || receipt.userName?.toLowerCase().includes(term)) : exported;
      const campusIds = Array.from(new Set(exportRows.map((receipt) => receipt.campusId || campusId).filter(Boolean)));
    const campusRows = await Promise.all(campusIds.map((id) => loadCampusForExport(id)));
    const campusById = new Map(campusRows.filter(Boolean).map((campus) => [String(campus.id), campus]));
    downloadCsv({
      filename: 'receipts.csv',
      headers: ['Receipt ID', 'Receipt Number', 'Payment ID', 'Invoice Number', 'User Type', 'User ID', 'User Name', 'Campus ID', 'Campus Name', 'Campus Logo URL', 'Amount', 'Method', 'Issued At'],
      rows: exportRows.map((receipt) => {
        const id = receipt.campusId || campusId;
        const campus = campusById.get(String(id));
        return [receipt.id, receipt.receiptNumber, receipt.paymentId, receipt.invoiceNumber, receipt.userType, receipt.userId, receipt.userName, id, campus?.name, campus?.logoUrl, receipt.amount, receipt.paymentMethod, receipt.issuedAt?.slice(0, 10)];
      }),
    });
    } catch (error) {
      toast({ title: 'Receipt export failed', description: error?.message || 'Could not load current receipts.', status: 'error', duration: 4000 });
    }
  };

  const printReceipt = async (receipt) => {
    let currentReceipt = receipt;
    if (receipt?.paymentId) {
      try {
        currentReceipt = { ...receipt, ...await financeApi.createReceipt(receipt.paymentId) };
      } catch (error) {
        toast({ title: 'Using the loaded receipt', description: error?.message || 'Could not refresh receipt data.', status: 'warning', duration: 3000 });
      }
    }
    const content = `<div class="meta-grid">
      <p><strong>Receipt ID</strong><br>${escapeHtml(currentReceipt?.id ?? '—')}</p>
      <p><strong>Receipt Number</strong><br>${escapeHtml(currentReceipt?.receiptNumber || '—')}</p>
      <p><strong>Payment ID</strong><br>${escapeHtml(currentReceipt?.paymentId ?? '—')}</p>
      <p><strong>Invoice</strong><br>${escapeHtml(currentReceipt?.invoiceNumber || '—')}</p>
      <p><strong>User</strong><br>${escapeHtml(currentReceipt?.userName || '—')} (ID ${escapeHtml(currentReceipt?.userId ?? '—')})</p>
      <p><strong>User Type</strong><br>${escapeHtml(currentReceipt?.userType || '—')}</p>
      <p><strong>Payment Method</strong><br>${escapeHtml(currentReceipt?.paymentMethod || 'Cash')}</p>
      <p><strong>Date</strong><br>${escapeHtml(currentReceipt?.issuedAt?.slice(0, 10) || '—')}</p>
    </div><table><thead><tr><th>Payment</th><th>Amount</th></tr></thead><tbody><tr><td>Amount received</td><td>Rs. ${Number(currentReceipt?.amount || 0).toLocaleString()}</td></tr></tbody></table>`;
    await openCampusPrintDocument({ campusId: currentReceipt?.campusId || campusId, title: 'Payment Receipt', documentId: currentReceipt?.receiptNumber || currentReceipt?.id, content });
  };

  if (loading && receipts.length === 0) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }} textAlign="center">
        <Spinner size="xl" />
        <Text mt={3}>Loading receipts...</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center">
        <Box>
          <Heading as="h3" size="lg" mb={1}>Receipts</Heading>
          <Text color={textColorSecondary}>View and print payment receipts</Text>
        </Box>
        <ButtonGroup>
          <Button leftIcon={<MdFileDownload />} variant='outline' onClick={exportCSV}>Export CSV</Button>
        </ButtonGroup>
      </Flex>

      {/* No Users Warning */}
      <NoUsersWarning counts={counts} />

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <MiniStatistics
          name="Total Amount"
          value={`Rs. ${stats.total.toLocaleString()}`}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#11998e 0%,#38ef7d 100%)' icon={<Icon as={MdReceipt} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Total Receipts"
          value={String(stats.count)}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#00c6ff 0%,#0072ff 100%)' icon={<Icon as={MdReceipt} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Student Receipts"
          value={String(stats.students)}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#FDBB2D 0%,#22C1C3 100%)' icon={<Icon as={MdReceipt} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Staff Receipts"
          value={String(stats.teachers + stats.drivers)}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#f5576c 0%,#f093fb 100%)' icon={<Icon as={MdReceipt} w='28px' h='28px' color='white' />} />}
        />
      </SimpleGrid>

      {/* Role Filter */}
      <Card p={4} mb={5}>
        <UserTypeFilter value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(1); }} counts={counts} />
      </Card>

      {/* Filters */}
      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <InputGroup maxW='280px'>
            <InputLeftElement pointerEvents='none'>
              <MdSearch color='gray.400' />
            </InputLeftElement>
            <Input placeholder='Search receipt' value={search} onChange={(e) => setSearch(e.target.value)} />
          </InputGroup>
        </Flex>
      </Card>

      {/* Table */}
      <Card>
        <Box overflowX='auto'>
          <Box maxH='500px' overflowY='auto'>
            <Table size='sm' variant='simple'>
              <Thead position='sticky' top={0} zIndex={1} bg={useColorModeValue('gray.50', 'gray.800')}>
                <Tr>
                  <Th>Receipt</Th>
                  <Th>Invoice</Th>
                  <Th>Type</Th>
                  <Th>User</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Method</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.length === 0 ? (
                  <Tr><Td colSpan={8} textAlign="center" py={8} color={textColorSecondary}>No receipts found</Td></Tr>
                ) : filtered.map((r) => (
                  <Tr key={r.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                    <Td><Text fontWeight='600'>{r.receiptNumber}</Text></Td>
                    <Td>{r.invoiceNumber || '-'}</Td>
                    <Td>
                      <Badge colorScheme={r.userType === 'student' ? 'blue' : r.userType === 'teacher' ? 'green' : 'orange'}>
                        {r.userType}
                      </Badge>
                    </Td>
                    <Td>{r.userName}</Td>
                    <Td isNumeric fontWeight='600' color='green.500'>Rs. {Number(r.amount).toLocaleString()}</Td>
                    <Td><Badge>{r.paymentMethod || 'cash'}</Badge></Td>
                    <Td>{r.issuedAt?.slice(0, 10) || '-'}</Td>
                    <Td>
                      <Button size='xs' leftIcon={<MdPrint />} variant='outline' onClick={() => printReceipt(r)}>
                        Print
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
