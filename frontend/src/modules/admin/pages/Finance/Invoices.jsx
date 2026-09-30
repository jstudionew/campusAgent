import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Icon, Badge, Button, ButtonGroup,
  useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Select, Input,
  InputGroup, InputLeftElement, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  IconButton, Checkbox, FormControl, FormLabel, Spinner, useToast, Alert, AlertIcon
} from '@chakra-ui/react';
import { MdReceipt, MdPending, MdDoneAll, MdAdd, MdSearch, MdSend, MdFileDownload, MdPictureAsPdf, MdRemoveRedEye, MdEdit, MdDelete } from 'react-icons/md';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import IconBox from '../../../../components/icons/IconBox';
import StatCard from '../../../../components/card/StatCard';
import UserTypeSelector, { UserTypeFilter } from './components/UserTypeSelector';
import UserSelector from './components/UserSelector';
import NoUsersWarning, { UserRequiredNotice } from './components/NoUsersWarning';
import { useFinanceUsers, useUnifiedInvoices } from '../../../../hooks/useFinanceUsers';
import { financeApi } from '../../../../services/financeApi';
import { useLocation } from 'react-router-dom';
import { downloadCsv, escapeHtml, loadCampusForExport, openCampusPrintDocument } from '../../../../utils/campusExports';

export default function Invoices() {
  const toast = useToast();
  const location = useLocation();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');

  // State
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  // Modals
  const viewDisc = useDisclosure();
  const createDisc = useDisclosure();
  const editDisc = useDisclosure();

  // Create form state
  const [createForm, setCreateForm] = useState({
    userType: '',
    user: null,
    invoiceType: 'fee',
    amount: 0,
    tax: 0,
    discount: 0,
    description: '',
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const prefill = location?.state?.prefillInvoice;
    if (!prefill) return;

    const userType = String(prefill.userType || 'student');
    const user = prefill.user && prefill.user.id ? prefill.user : (prefill.userId ? { id: prefill.userId, name: prefill.userName || 'Selected User' } : null);
    const amount = Number(prefill.amount ?? 0) || 0;
    const invoiceType = String(prefill.invoiceType || 'fee');

    setCreateForm((prev) => ({
      ...prev,
      userType,
      user,
      amount,
      invoiceType,
      description: String(prefill.description || prev.description || ''),
    }));
    setFormError('');
    if (!createDisc.isOpen) createDisc.onOpen();

    try {
      window.history.replaceState({}, document.title);
    } catch (_) {}
  }, [location, createDisc]);

  const [editForm, setEditForm] = useState({
    id: null,
    amount: 0,
    tax: 0,
    discount: 0,
    status: 'pending',
    dueDate: '',
    description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Hooks
  const { loading: usersLoading, hasUsers, counts } = useFinanceUsers();
  const {
    loading: invoicesLoading,
    invoices,
    total,
    refresh: refreshInvoices
  } = useUnifiedInvoices({
    userType: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    pageSize
  });

  const loading = usersLoading || invoicesLoading;

  // Filter invoices by search
  const filteredInvoices = useMemo(() => {
    if (!search) return invoices;
    const s = search.toLowerCase();
    return invoices.filter(i =>
      i.invoiceNumber?.toLowerCase().includes(s) ||
      i.userName?.toLowerCase().includes(s)
    );
  }, [invoices, search]);

  // Stats
  const stats = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'partial').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
  }), [invoices]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Handlers
  const handleCreateOpen = () => {
    if (!hasUsers) {
      toast({
        title: 'No users available',
        description: 'Please add a Student, Teacher, or Driver first.',
        status: 'warning',
        duration: 4000,
      });
      return;
    }
    setCreateForm({
      userType: counts.students > 0 ? 'student' : counts.teachers > 0 ? 'teacher' : 'driver',
      user: null,
      invoiceType: 'fee',
      amount: 0,
      tax: 0,
      discount: 0,
      description: '',
      dueDate: '',
    });
    setFormError('');
    createDisc.onOpen();
  };

  const handleCreate = async () => {
    // Validation
    if (!createForm.userType) {
      setFormError('Please select a user type');
      return;
    }
    if (!createForm.user) {
      setFormError('Please select a user');
      return;
    }
    if (!createForm.amount || createForm.amount <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    setCreating(true);
    setFormError('');

    try {
      await financeApi.createUnifiedInvoice({
        userType: createForm.userType,
        userId: createForm.user.id,
        invoiceType: createForm.invoiceType,
        amount: Number(createForm.amount),
        tax: Number(createForm.tax) || 0,
        discount: Number(createForm.discount) || 0,
        description: createForm.description,
        dueDate: createForm.dueDate || undefined,
      });

      toast({ title: 'Invoice created successfully', status: 'success', duration: 3000 });
      createDisc.onClose();
      refreshInvoices();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const exportCSV = async () => {
    try {
      const exported = [];
      let pageNumber = 1;
      let expectedTotal = Infinity;
      while (exported.length < expectedTotal) {
        const response = await financeApi.listUnifiedInvoices({
          userType: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: pageNumber,
          pageSize: 200,
        });
        const rows = Array.isArray(response?.items) ? response.items : [];
        expectedTotal = Number(response?.total) || rows.length;
        exported.push(...rows);
        if (!rows.length || rows.length < 200) break;
        pageNumber += 1;
      }
      const term = search.trim().toLowerCase();
      const rows = term
        ? exported.filter((invoice) => invoice.invoiceNumber?.toLowerCase().includes(term) || invoice.userName?.toLowerCase().includes(term))
        : exported;
      const campusIds = Array.from(new Set(rows.map((invoice) => invoice.campusId).filter(Boolean)));
      const campuses = await Promise.all(campusIds.map((id) => loadCampusForExport(id)));
      const campusById = new Map(campuses.filter(Boolean).map((campus) => [String(campus.id), campus]));
      downloadCsv({
        filename: 'invoices.csv',
        headers: ['Invoice ID', 'Invoice Number', 'User Type', 'User ID', 'User Name', 'Campus ID', 'Campus Name', 'Campus Logo URL', 'Invoice Type', 'Amount', 'Tax', 'Discount', 'Total', 'Balance', 'Status', 'Issued Date', 'Due Date'],
        rows: rows.map((invoice) => {
          const campus = campusById.get(String(invoice.campusId));
          return [invoice.id, invoice.invoiceNumber, invoice.userType, invoice.userId, invoice.userName, invoice.campusId, campus?.name, campus?.logoUrl, invoice.invoiceType, invoice.amount, invoice.tax, invoice.discount, invoice.total, invoice.balance, invoice.status, invoice.issuedAt?.slice(0, 10), invoice.dueDate?.slice(0, 10)];
        }),
      });
    } catch (error) {
      toast({ title: 'Invoice export failed', description: error?.message || 'Could not load current invoices.', status: 'error', duration: 4000 });
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = (checked) => setSelectedIds(checked ? filteredInvoices.map(i => i.id) : []);

  const openEdit = (invoice) => {
    setSelected(invoice);
    setEditForm({
      id: invoice.id,
      amount: Number(invoice.amount ?? invoice.total ?? 0),
      tax: Number(invoice.tax ?? 0),
      discount: Number(invoice.discount ?? 0),
      status: invoice.status || 'pending',
      dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '',
      description: invoice.description || '',
    });
    setFormError('');
    editDisc.onOpen();
  };

  const handleUpdate = async () => {
    if (!editForm.id) return;
    setSavingEdit(true);
    try {
      await financeApi.updateUnifiedInvoice(editForm.id, {
        amount: Number(editForm.amount),
        tax: Number(editForm.tax) || 0,
        discount: Number(editForm.discount) || 0,
        status: editForm.status || undefined,
        dueDate: editForm.dueDate || undefined,
        description: editForm.description || undefined,
      });
      toast({ title: 'Invoice updated', status: 'success', duration: 2500 });
      editDisc.onClose();
      refreshInvoices();
    } catch (e) {
      toast({ title: 'Update failed', description: e?.data?.message || e.message, status: 'error', duration: 3500 });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!invoice?.id) return;
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await financeApi.deleteUnifiedInvoice(invoice.id);
      toast({ title: 'Invoice deleted', status: 'success', duration: 2500 });
      refreshInvoices();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.data?.message || e.message, status: 'error', duration: 3500 });
    }
  };

  const printInvoice = async (inv) => {
    const issuedAt = inv?.issuedAt ? String(inv.issuedAt).slice(0, 10) : '';
    const dueDate = inv?.dueDate ? String(inv.dueDate).slice(0, 10) : '';
    const content = `<div class="meta-grid">
      <p><strong>Invoice Number</strong><br>${escapeHtml(inv?.invoiceNumber || '—')}</p>
      <p><strong>Invoice ID</strong><br>${escapeHtml(inv?.id ?? '—')}</p>
      <p><strong>Billed To</strong><br>${escapeHtml(inv?.userName || '—')}</p>
      <p><strong>User ID</strong><br>${escapeHtml(inv?.userId ?? '—')} (${escapeHtml(inv?.userType || '—')})</p>
      <p><strong>Issued</strong><br>${escapeHtml(issuedAt || '—')}</p>
      <p><strong>Due</strong><br>${escapeHtml(dueDate || '—')}</p>
      <p><strong>Status</strong><br>${escapeHtml(String(inv?.status || '—').toUpperCase())}</p>
    </div>
    <p>${escapeHtml(inv?.description || '')}</p>
    <table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>
      <tr><td>${escapeHtml(inv?.invoiceType || 'Invoice')}</td><td>Rs. ${Number(inv?.amount ?? inv?.total ?? 0).toLocaleString()}</td></tr>
      <tr><td>Tax</td><td>Rs. ${Number(inv?.tax || 0).toLocaleString()}</td></tr>
      <tr><td>Discount</td><td>- Rs. ${Number(inv?.discount || 0).toLocaleString()}</td></tr>
      <tr><td><strong>Total</strong></td><td><strong>Rs. ${Number(inv?.total || 0).toLocaleString()}</strong></td></tr>
      <tr><td><strong>Balance</strong></td><td><strong>Rs. ${Number(inv?.balance || 0).toLocaleString()}</strong></td></tr>
    </tbody></table>`;
    await openCampusPrintDocument({ campusId: inv?.campusId, title: 'Invoice', documentId: inv?.invoiceNumber || inv?.id, content });
  };

  const handlePrint = async (invoice) => {
    setPrintingId(invoice?.id);
    try {
      const fresh = await financeApi.getUnifiedInvoiceById(invoice.id);
      printInvoice({ ...invoice, ...fresh });
    } catch {
      printInvoice(invoice);
    } finally {
      setPrintingId(null);
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }} textAlign="center">
        <Spinner size="xl" />
        <Text mt={3}>Loading invoices...</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center">
        <Box>
          <Heading as="h3" size="lg" mb={1}>Invoices</Heading>
          <Text color={textColorSecondary}>Generate and manage unified fee invoices</Text>
        </Box>
        <Flex gap={2} align='center' wrap='wrap'>
          <Button size='sm' leftIcon={<MdAdd />} colorScheme='blue' onClick={handleCreateOpen} isDisabled={!hasUsers}>
            Create Invoice
          </Button>
          <Button size='sm' leftIcon={<MdFileDownload />} variant='outline' onClick={exportCSV}>Export CSV</Button>
          <Button size='sm' leftIcon={<MdPictureAsPdf />} colorScheme='blue'>Generate PDF</Button>
        </Flex>
      </Flex>

      {/* No Users Warning */}
      <NoUsersWarning counts={counts} />

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <StatCard title="Total" value={String(total)} icon={MdReceipt} colorScheme="blue" />
        <StatCard title="Paid" value={String(stats.paid)} icon={MdDoneAll} colorScheme="green" />
        <StatCard title="Pending" value={String(stats.pending)} icon={MdPending} colorScheme="orange" />
        <StatCard title="Overdue" value={String(stats.overdue)} icon={MdReceipt} colorScheme="red" />
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
            <Input placeholder='Search invoice or user' value={search} onChange={(e) => setSearch(e.target.value)} />
          </InputGroup>
          <Select maxW='180px' value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value='all'>All Status</option>
            <option value='paid'>Paid</option>
            <option value='pending'>Pending</option>
            <option value='partial'>Partial</option>
            <option value='overdue'>Overdue</option>
          </Select>
        </Flex>
      </Card>

      {/* Table */}
      <Card>
        <Box overflowX='auto'>
          <Box maxH='420px' overflowY='auto'>
            <Table size='sm' variant='simple'>
              <Thead position='sticky' top={0} zIndex={1} bg={useColorModeValue('gray.50', 'gray.800')}>
                <Tr>
                  <Th width='40px'>
                    <Checkbox
                      isChecked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                      isIndeterminate={selectedIds.length > 0 && selectedIds.length < filteredInvoices.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </Th>
                  <Th>Invoice</Th>
                  <Th>Type</Th>
                  <Th>User</Th>
                  <Th isNumeric>Amount</Th>
                  <Th isNumeric>Balance</Th>
                  <Th>Status</Th>
                  <Th>Due Date</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredInvoices.length === 0 ? (
                  <Tr><Td colSpan={9} textAlign="center" py={8} color={textColorSecondary}>No invoices found</Td></Tr>
                ) : filteredInvoices.map((i) => (
                  <Tr key={i.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                    <Td><Checkbox isChecked={selectedIds.includes(i.id)} onChange={() => toggleSelect(i.id)} /></Td>
                    <Td><Text fontWeight='600'>{i.invoiceNumber}</Text></Td>
                    <Td>
                      <Badge colorScheme={i.userType === 'student' ? 'blue' : i.userType === 'teacher' ? 'green' : 'orange'}>
                        {i.userType}
                      </Badge>
                    </Td>
                    <Td>{i.userName}</Td>
                    <Td isNumeric>Rs. {Number(i.total).toLocaleString()}</Td>
                    <Td isNumeric>Rs. {Number(i.balance).toLocaleString()}</Td>
                    <Td><Badge colorScheme={i.status === 'paid' ? 'green' : i.status === 'pending' ? 'yellow' : i.status === 'partial' ? 'purple' : 'red'}>{i.status}</Badge></Td>
                    <Td><Text color={textColorSecondary}>{i.dueDate?.slice(0, 10) || '-'}</Text></Td>
                    <Td>
                      <Flex gap={1}>
                        <IconButton aria-label='View' icon={<MdRemoveRedEye />} size='sm' variant='ghost' onClick={() => { setSelected(i); viewDisc.onOpen(); }} />
                        <IconButton aria-label='Edit' icon={<MdEdit />} size='sm' variant='ghost' onClick={() => openEdit(i)} />
                        <IconButton aria-label='Delete' icon={<MdDelete />} size='sm' variant='ghost' colorScheme='red' onClick={() => handleDelete(i)} />
                        <Button size='xs' leftIcon={<MdPictureAsPdf />} variant='outline' onClick={() => handlePrint(i)} isLoading={printingId === i.id}>
                          Print
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Card>

      {/* Pagination */}
      <Flex justify='space-between' align='center' mt={3} mb={8} px={2}>
        <Text fontSize='sm' color={textColorSecondary}>
          Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total}
        </Text>
        <Flex align='center' gap={3}>
          <Select size='sm' w='auto' value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </Select>
          <Button size='sm' onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page === 1}>Prev</Button>
          <Text fontSize='sm'>Page {page} / {totalPages}</Text>
          <Button size='sm' onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page === totalPages}>Next</Button>
        </Flex>
      </Flex>

      {/* View Modal */}
      <Modal isOpen={viewDisc.isOpen} onClose={viewDisc.onClose} size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invoice Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selected && (
              <Box>
                <Text><strong>Invoice:</strong> {selected.invoiceNumber}</Text>
                <Text><strong>User Type:</strong> <Badge colorScheme={selected.userType === 'student' ? 'blue' : selected.userType === 'teacher' ? 'green' : 'orange'}>{selected.userType}</Badge></Text>
                <Text><strong>User:</strong> {selected.userName}</Text>
                <Text><strong>Invoice Type:</strong> {selected.invoiceType}</Text>
                <Text><strong>Amount:</strong> Rs. {Number(selected.total).toLocaleString()}</Text>
                <Text><strong>Balance:</strong> Rs. {Number(selected.balance).toLocaleString()}</Text>
                <Text><strong>Status:</strong> <Badge colorScheme={selected.status === 'paid' ? 'green' : 'yellow'}>{selected.status}</Badge></Text>
                <Text><strong>Due Date:</strong> {selected.dueDate?.slice(0, 10) || 'N/A'}</Text>
                <Text><strong>Description:</strong> {selected.description || 'N/A'}</Text>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={createDisc.isOpen} onClose={createDisc.onClose} size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Invoice</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <UserRequiredNotice />

            {formError && (
              <Alert status='error' mb={4} borderRadius='md'>
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <FormControl mb={4} isRequired>
              <FormLabel>User Type</FormLabel>
              <UserTypeSelector
                value={createForm.userType}
                onChange={(type) => setCreateForm(f => ({ ...f, userType: type, user: null }))}
                counts={counts}
                showCounts={true}
              />
            </FormControl>

            <UserSelector
              userType={createForm.userType}
              value={createForm.user}
              onChange={(user) => setCreateForm(f => ({ ...f, user }))}
              isRequired
              label="Select User"
              error={!createForm.user && formError ? 'User is required' : ''}
            />

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl isRequired>
                <FormLabel>Invoice Type</FormLabel>
                <Select value={createForm.invoiceType} onChange={(e) => setCreateForm(f => ({ ...f, invoiceType: e.target.value }))}>
                  {createForm.userType === 'student' ? (
                    <>
                      <option value='fee'>Fee</option>
                      <option value='exam_fee'>Exam Fee</option>
                      <option value='annual_fee'>Annual Fee</option>
                      <option value='admission_fee'>Admission Fee</option>
                      <option value='transport_fee'>Transport Fee</option>
                      <option value='other'>Other</option>
                    </>
                  ) : (
                    <>
                      <option value='salary'>Salary</option>
                      <option value='allowance'>Allowance</option>
                      <option value='deduction'>Deduction</option>
                      <option value='other'>Other</option>
                    </>
                  )}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Amount</FormLabel>
                <Input type='number' value={createForm.amount} onChange={(e) => setCreateForm(f => ({ ...f, amount: e.target.value }))} />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Tax</FormLabel>
                <Input type='number' value={createForm.tax} onChange={(e) => setCreateForm(f => ({ ...f, tax: e.target.value }))} />
              </FormControl>

              <FormControl>
                <FormLabel>Discount</FormLabel>
                <Input type='number' value={createForm.discount} onChange={(e) => setCreateForm(f => ({ ...f, discount: e.target.value }))} />
              </FormControl>
            </SimpleGrid>

            <FormControl mt={4}>
              <FormLabel>Due Date</FormLabel>
              <Input type='date' value={createForm.dueDate} onChange={(e) => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} />
            </FormControl>

            <FormControl mt={4}>
              <FormLabel>Description</FormLabel>
              <Input value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder='Optional description' />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={createDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={handleCreate} isLoading={creating} isDisabled={!createForm.user}>
              Create Invoice
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editDisc.isOpen} onClose={editDisc.onClose} size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Invoice</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formError && (
              <Alert status='error' mb={4} borderRadius='md'>
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value='pending'>Pending</option>
                  <option value='partial'>Partial</option>
                  <option value='paid'>Paid</option>
                  <option value='overdue'>Overdue</option>
                  <option value='cancelled'>Cancelled</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Due Date</FormLabel>
                <Input type='date' value={editForm.dueDate} onChange={(e) => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={3} spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Amount</FormLabel>
                <Input type='number' value={editForm.amount} onChange={(e) => setEditForm(f => ({ ...f, amount: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Tax</FormLabel>
                <Input type='number' value={editForm.tax} onChange={(e) => setEditForm(f => ({ ...f, tax: e.target.value }))} />
              </FormControl>
              <FormControl>
                <FormLabel>Discount</FormLabel>
                <Input type='number' value={editForm.discount} onChange={(e) => setEditForm(f => ({ ...f, discount: e.target.value }))} />
              </FormControl>
            </SimpleGrid>

            <FormControl mt={4}>
              <FormLabel>Description</FormLabel>
              <Input value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder='Optional description' />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={editDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={handleUpdate} isLoading={savingEdit}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
