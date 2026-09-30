import React, { useState, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Icon, Badge, Button, ButtonGroup,
  useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Select, Input,
  InputGroup, InputLeftElement, Spinner, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Alert, AlertIcon
} from '@chakra-ui/react';
import { MdPayment, MdAdd, MdSearch, MdFileDownload, MdReceipt } from 'react-icons/md';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import IconBox from '../../../../components/icons/IconBox';
import { UserTypeFilter } from './components/UserTypeSelector';
import NoUsersWarning from './components/NoUsersWarning';
import { useFinanceUsers, useUnifiedPayments, useUnifiedInvoices } from '../../../../hooks/useFinanceUsers';
import { financeApi } from '../../../../services/financeApi';
import { useAuth } from '../../../../contexts/AuthContext';
import { downloadCsv, escapeHtml, loadCampusForExport, openCampusPrintDocument } from '../../../../utils/campusExports';

export default function Payments() {
  const toast = useToast();
  const { campusId } = useAuth();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');

  // State
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [printingId, setPrintingId] = useState(null);

  // Modals
  const createDisc = useDisclosure();

  // Create form
  const [createForm, setCreateForm] = useState({
    invoiceId: '',
    amount: 0,
    method: 'cash',
    referenceNumber: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Hooks
  const { loading: usersLoading, hasUsers, counts } = useFinanceUsers();
  const {
    loading: paymentsLoading,
    payments,
    refresh: refreshPayments
  } = useUnifiedPayments({
    userType: roleFilter !== 'all' ? roleFilter : undefined,
    page,
    pageSize
  });

  // Get unpaid invoices for payment creation
  const { invoices: unpaidInvoices } = useUnifiedInvoices({ status: 'pending', pageSize: 100 });

  const loading = usersLoading || paymentsLoading;

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return payments;
    const s = search.toLowerCase();
    return payments.filter(p =>
      p.invoiceNumber?.toLowerCase().includes(s) ||
      p.userName?.toLowerCase().includes(s) ||
      p.referenceNumber?.toLowerCase().includes(s)
    );
  }, [payments, search]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);
    const cash = filtered.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount || 0), 0);
    const bank = filtered.filter(p => p.method === 'bank').reduce((s, p) => s + Number(p.amount || 0), 0);
    const online = filtered.filter(p => p.method === 'online').reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, cash, bank, online, count: filtered.length };
  }, [filtered]);

  const handleCreateOpen = () => {
    if (unpaidInvoices.length === 0) {
      toast({
        title: 'No pending invoices',
        description: 'There are no pending invoices to pay.',
        status: 'info',
        duration: 3000,
      });
      return;
    }
    setCreateForm({
      invoiceId: unpaidInvoices[0]?.id || '',
      amount: 0,
      method: 'cash',
      referenceNumber: '',
      notes: '',
    });
    setFormError('');
    createDisc.onOpen();
  };

  const handleCreate = async () => {
    if (!createForm.invoiceId) {
      setFormError('Please select an invoice');
      return;
    }
    if (!createForm.amount || createForm.amount <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    setCreating(true);
    setFormError('');

    try {
      await financeApi.createUnifiedPayment({
        invoiceId: Number(createForm.invoiceId),
        amount: Number(createForm.amount),
        method: createForm.method,
        referenceNumber: createForm.referenceNumber || undefined,
        notes: createForm.notes || undefined,
      });

      toast({ title: 'Payment recorded successfully', status: 'success', duration: 3000 });
      createDisc.onClose();
      refreshPayments();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to record payment');
    } finally {
      setCreating(false);
    }
  };

  const exportCSV = async () => {
    try {
      const exported = [];
      let pageNumber = 1;
      while (true) {
        const response = await financeApi.listUnifiedPayments({ userType: roleFilter !== 'all' ? roleFilter : undefined, page: pageNumber, pageSize: 200 });
        const rows = Array.isArray(response?.items) ? response.items : [];
        exported.push(...rows);
        if (rows.length < 200) break;
        pageNumber += 1;
      }
      const term = search.trim().toLowerCase();
      const exportRows = term ? exported.filter((payment) => payment.invoiceNumber?.toLowerCase().includes(term) || payment.userName?.toLowerCase().includes(term)) : exported;
      const campusIds = Array.from(new Set(exportRows.map((payment) => payment.campusId || campusId).filter(Boolean)));
    const campusRows = await Promise.all(campusIds.map((id) => loadCampusForExport(id)));
    const campusById = new Map(campusRows.filter(Boolean).map((campus) => [String(campus.id), campus]));
    downloadCsv({
      filename: 'payments.csv',
      headers: ['Payment ID', 'Invoice ID', 'Invoice Number', 'User Type', 'User ID', 'User Name', 'Campus ID', 'Campus Name', 'Campus Logo URL', 'Amount', 'Method', 'Reference', 'Paid At'],
      rows: exportRows.map((payment) => {
        const id = payment.campusId || campusId;
        const campus = campusById.get(String(id));
        return [payment.id, payment.invoiceId, payment.invoiceNumber, payment.userType, payment.userId, payment.userName, id, campus?.name, campus?.logoUrl, payment.amount, payment.method, payment.referenceNumber, payment.paidAt?.slice(0, 10)];
      }),
    });
    } catch (error) {
      toast({ title: 'Payment export failed', description: error?.message || 'Could not load current payments.', status: 'error', duration: 4000 });
    }
  };

  const printReceipt = async (receipt) => {
    const issuedAt = receipt?.issuedAt ? String(receipt.issuedAt).slice(0, 19).replace('T', ' ') : '';
    const paidAt = receipt?.paidAt ? String(receipt.paidAt).slice(0, 19).replace('T', ' ') : '';
    const method = receipt?.paymentMethod || 'cash';
    const content = `<div class="meta-grid">
      <p><strong>Receipt ID</strong><br>${escapeHtml(receipt?.id ?? '—')}</p>
      <p><strong>Receipt Number</strong><br>${escapeHtml(receipt?.receiptNumber || '—')}</p>
      <p><strong>Invoice</strong><br>${escapeHtml(receipt?.invoiceNumber || '—')}</p>
      <p><strong>Payment ID</strong><br>${escapeHtml(receipt?.paymentId ?? '—')}</p>
      <p><strong>Received From</strong><br>${escapeHtml(receipt?.userName || '—')} (ID ${escapeHtml(receipt?.userId ?? '—')})</p>
      <p><strong>User Type</strong><br>${escapeHtml(receipt?.userType || '—')}</p>
      <p><strong>Method</strong><br>${escapeHtml(String(method).toUpperCase())}</p>
      <p><strong>Reference</strong><br>${escapeHtml(receipt?.referenceNumber || '—')}</p>
      <p><strong>Paid At</strong><br>${escapeHtml(paidAt || '—')}</p>
      <p><strong>Issued At</strong><br>${escapeHtml(issuedAt || '—')}</p>
    </div><table><thead><tr><th>Payment</th><th>Amount</th></tr></thead><tbody><tr><td>Amount Received</td><td>Rs. ${Number(receipt?.amount || 0).toLocaleString()}</td></tr></tbody></table>`;
    await openCampusPrintDocument({ campusId: receipt?.campusId || campusId, title: 'Payment Receipt', documentId: receipt?.receiptNumber || receipt?.id, content });
  };

  const generateReceipt = async (payment) => {
    setPrintingId(payment?.id);
    try {
      const receipt = await financeApi.createReceipt(payment.id);
      toast({ title: 'Receipt generated', status: 'success', duration: 2000 });
      printReceipt(receipt);
    } catch (e) {
      toast({ title: 'Failed to generate receipt', description: e?.data?.message || e.message, status: 'error', duration: 3000 });
    } finally {
      setPrintingId(null);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }} textAlign="center">
        <Spinner size="xl" />
        <Text mt={3}>Loading payments...</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center">
        <Box>
          <Heading as="h3" size="lg" mb={1}>Payments</Heading>
          <Text color={textColorSecondary}>Record and track all payments</Text>
        </Box>
        <ButtonGroup>
          <Button leftIcon={<MdAdd />} colorScheme='blue' onClick={handleCreateOpen}>Record Payment</Button>
          <Button leftIcon={<MdFileDownload />} variant='outline' onClick={exportCSV}>Export CSV</Button>
        </ButtonGroup>
      </Flex>

      {/* No Users Warning */}
      <NoUsersWarning counts={counts} />

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <MiniStatistics
          name="Total Collected"
          value={`Rs. ${stats.total.toLocaleString()}`}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#11998e 0%,#38ef7d 100%)' icon={<Icon as={MdPayment} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Cash"
          value={`Rs. ${stats.cash.toLocaleString()}`}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#00c6ff 0%,#0072ff 100%)' icon={<Icon as={MdPayment} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Bank Transfer"
          value={`Rs. ${stats.bank.toLocaleString()}`}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#FDBB2D 0%,#22C1C3 100%)' icon={<Icon as={MdPayment} w='28px' h='28px' color='white' />} />}
        />
        <MiniStatistics
          name="Online"
          value={`Rs. ${stats.online.toLocaleString()}`}
          startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#f5576c 0%,#f093fb 100%)' icon={<Icon as={MdPayment} w='28px' h='28px' color='white' />} />}
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
            <Input placeholder='Search payment' value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <Th>Invoice</Th>
                  <Th>Type</Th>
                  <Th>User</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Method</Th>
                  <Th>Reference</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.length === 0 ? (
                  <Tr><Td colSpan={8} textAlign="center" py={8} color={textColorSecondary}>No payments found</Td></Tr>
                ) : filtered.map((p) => (
                  <Tr key={p.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                    <Td><Text fontWeight='600'>{p.invoiceNumber}</Text></Td>
                    <Td>
                      <Badge colorScheme={p.userType === 'student' ? 'blue' : p.userType === 'teacher' ? 'green' : 'orange'}>
                        {p.userType}
                      </Badge>
                    </Td>
                    <Td>{p.userName}</Td>
                    <Td isNumeric fontWeight='600' color='green.500'>Rs. {Number(p.amount).toLocaleString()}</Td>
                    <Td><Badge>{p.method || 'cash'}</Badge></Td>
                    <Td>{p.referenceNumber || '-'}</Td>
                    <Td>{p.paidAt?.slice(0, 10) || '-'}</Td>
                    <Td>
                      <Button size='xs' leftIcon={<MdReceipt />} variant='outline' onClick={() => generateReceipt(p)} isLoading={printingId === p.id}>
                        Receipt
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Card>

      {/* Create Payment Modal */}
      <Modal isOpen={createDisc.isOpen} onClose={createDisc.onClose} size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formError && (
              <Alert status='error' mb={4} borderRadius='md'>
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <FormControl mb={4} isRequired>
              <FormLabel>Invoice</FormLabel>
              <Select value={createForm.invoiceId} onChange={(e) => setCreateForm(f => ({ ...f, invoiceId: e.target.value }))}>
                {unpaidInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.userName} (Rs. {Number(inv.balance).toLocaleString()})
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={4} isRequired>
              <FormLabel>Amount</FormLabel>
              <Input type='number' value={createForm.amount} onChange={(e) => setCreateForm(f => ({ ...f, amount: e.target.value }))} />
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Payment Method</FormLabel>
              <Select value={createForm.method} onChange={(e) => setCreateForm(f => ({ ...f, method: e.target.value }))}>
                <option value='cash'>Cash</option>
                <option value='bank'>Bank Transfer</option>
                <option value='online'>Online</option>
                <option value='cheque'>Cheque</option>
              </Select>
            </FormControl>

            <FormControl mb={4}>
              <FormLabel>Reference Number</FormLabel>
              <Input value={createForm.referenceNumber} onChange={(e) => setCreateForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder='Transaction ID, Cheque No, etc.' />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Input value={createForm.notes} onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={createDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={handleCreate} isLoading={creating}>
              Record Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
