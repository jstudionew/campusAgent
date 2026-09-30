import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Icon, Badge, Button, ButtonGroup,
  IconButton, useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Select,
  Input, InputGroup, InputLeftElement, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, NumberInput, NumberInputField, Spinner, useToast, Alert, AlertIcon
} from '@chakra-ui/react';
import { MdWork, MdPeople, MdLocalShipping, MdAddCircle, MdSearch, MdFileDownload, MdPictureAsPdf, MdRemoveRedEye, MdEdit, MdDelete } from 'react-icons/md';
import { FaChalkboardTeacher, FaTruck } from 'react-icons/fa';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import IconBox from '../../../../components/icons/IconBox';
import StatCard from '../../../../components/card/StatCard';
import BarChart from '../../../../components/charts/BarChart';
import PieChart from '../../../../components/charts/PieChart';
import UserSelector from './components/UserSelector';
import NoUsersWarning from './components/NoUsersWarning';
import { useFinanceUsers, usePayrollSummary } from '../../../../hooks/useFinanceUsers';
import { driversApi, financeApi } from '../../../../services/financeApi';
import * as teacherApi from '../../../../services/api/teachers';
import { campusesApi } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { downloadCsv, escapeHtml, loadCampusForExport, openCampusPrintDocument } from '../../../../utils/campusExports';

export default function Payroll() {
  const toast = useToast();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');

  // State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [campusFilter, setCampusFilter] = useState('all');
  const [campuses, setCampuses] = useState([]);
  const { user, campusId } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  // Modals
  const viewDisc = useDisclosure();
  const createDisc = useDisclosure();
  const [editingRow, setEditingRow] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    role: 'teacher',
    user: null,
    periodMonth: '',
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonuses: 0,
    status: 'pending',
    transactionReference: '',
    paymentMethod: '',
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    iban: '',
    chequeNumber: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Hooks
  const { loading: usersLoading, hasUsers, counts } = useFinanceUsers();
  const {
    loading: payrollLoading,
    payroll,
    total,
    refresh: refreshPayroll
  } = usePayrollSummary({
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    periodMonth: monthFilter || undefined,
    campusId: campusFilter !== 'all' ? campusFilter : 'all',
    page,
    pageSize
  });

  // Load campuses for admin
  useEffect(() => {
    if (isAdmin) {
      campusesApi.list({ pageSize: 100 })
        .then(res => setCampuses(res.rows || []))
        .catch(err => console.error('Failed to load campuses', err));
    }
  }, [isAdmin]);

  const loading = usersLoading || payrollLoading;

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return payroll;
    const s = search.toLowerCase();
    return payroll.filter(r =>
      r.userName?.toLowerCase().includes(s) ||
      r.role?.toLowerCase().includes(s)
    );
  }, [payroll, search]);

  // Stats
  const stats = useMemo(() => ({
    total: filtered.reduce((s, r) => s + Number(r.totalAmount || 0), 0),
    pending: filtered.filter(r => r.status === 'pending').length,
    teachersTotal: filtered.filter(r => r.role === 'teacher').reduce((s, r) => s + Number(r.totalAmount || 0), 0),
    driversTotal: filtered.filter(r => r.role === 'driver').reduce((s, r) => s + Number(r.totalAmount || 0), 0),
  }), [filtered]);

  const byRole = useMemo(() => ({
    labels: ['Teachers', 'Drivers'],
    values: [
      filtered.filter(r => r.role === 'teacher').length,
      filtered.filter(r => r.role === 'driver').length
    ]
  }), [filtered]);

  // Handlers
  const handleCreateOpen = () => {
    const hasStaff = counts.teachers > 0 || counts.drivers > 0;
    if (!hasStaff) {
      toast({
        title: 'No staff available',
        description: 'Please add a Teacher or Driver first.',
        status: 'warning',
        duration: 4000,
      });
      return;
    }
    setCreateForm({
      role: counts.teachers > 0 ? 'teacher' : 'driver',
      user: null,
      periodMonth: new Date().toISOString().slice(0, 7),
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      bonuses: 0,
      status: 'pending',
      transactionReference: '',
      paymentMethod: '',
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: '',
      chequeNumber: '',
      notes: '',
    });
    setEditingRow(null);
    setFormError('');
    createDisc.onOpen();
  };

  const computeNet = (f) => Math.max(0, (Number(f.baseSalary) || 0) + (Number(f.allowances) || 0) + (Number(f.bonuses) || 0) - (Number(f.deductions) || 0));

  const handleCreate = async () => {
    if (!createForm.user) {
      setFormError('Please select an employee');
      return;
    }
    if (!createForm.periodMonth) {
      setFormError('Please select a month');
      return;
    }

    setCreating(true);
    setFormError('');

    try {
      if (createForm.role === 'teacher') {
        if (editingRow) {
          await teacherApi.updatePayroll(editingRow.id, {
            periodMonth: createForm.periodMonth,
            baseSalary: Number(createForm.baseSalary),
            allowances: Number(createForm.allowances),
            deductions: Number(createForm.deductions),
            bonuses: Number(createForm.bonuses),
            status: createForm.status,
            paymentMethod: createForm.paymentMethod || null,
            bankName: createForm.bankName || null,
            accountTitle: createForm.accountTitle || null,
            accountNumber: createForm.accountNumber || null,
            iban: createForm.iban || null,
            chequeNumber: createForm.chequeNumber || null,
            transactionReference: createForm.transactionReference || null,
            notes: createForm.notes,
            paidOn: createForm.status === 'paid' ? new Date().toISOString() : null,
          });
        } else {
          await teacherApi.createPayroll({
            teacherId: createForm.user.id,
            periodMonth: createForm.periodMonth,
            baseSalary: Number(createForm.baseSalary),
            allowances: Number(createForm.allowances),
            deductions: Number(createForm.deductions),
            bonuses: Number(createForm.bonuses),
            status: createForm.status,
            paymentMethod: createForm.paymentMethod || null,
            bankName: createForm.bankName || null,
            accountTitle: createForm.accountTitle || null,
            accountNumber: createForm.accountNumber || null,
            iban: createForm.iban || null,
            chequeNumber: createForm.chequeNumber || null,
            transactionReference: createForm.transactionReference || null,
            notes: createForm.notes,
            paidOn: createForm.status === 'paid' ? new Date().toISOString() : null,
          });
        }
      } else {
        const driverId = createForm.user.id;
        await driversApi.createPayroll(driverId, {
          periodMonth: createForm.periodMonth + '-01',
          baseSalary: Number(createForm.baseSalary),
          allowances: Number(createForm.allowances),
          deductions: Number(createForm.deductions),
          bonuses: Number(createForm.bonuses),
          status: createForm.status,
          paymentMethod: createForm.paymentMethod || null,
          bankName: createForm.bankName || null,
          accountTitle: createForm.accountTitle || null,
          accountNumber: createForm.accountNumber || null,
          iban: createForm.iban || null,
          chequeNumber: createForm.chequeNumber || null,
          transactionReference: createForm.transactionReference || null,
          paidOn: createForm.status === 'paid' ? new Date().toISOString() : null,
          notes: createForm.notes,
        });
      }

      toast({ title: editingRow ? 'Payroll updated successfully' : 'Payroll created successfully', status: 'success', duration: 3000 });
      createDisc.onClose();
      setEditingRow(null);
      refreshPayroll();
    } catch (e) {
      setFormError(e.response?.data?.message || 'Failed to create payroll');
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
        const response = await financeApi.getPayrollSummary({
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          periodMonth: monthFilter || undefined,
          campusId: campusFilter !== 'all' ? campusFilter : campusId || undefined,
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
      const rows = term ? exported.filter((row) => row.userName?.toLowerCase().includes(term)) : exported;
      const campusIds = Array.from(new Set(rows.map((row) => row.campusId).filter(Boolean)));
      const campusRows = await Promise.all(campusIds.map((id) => loadCampusForExport(id)));
      const campusById = new Map(campusRows.filter(Boolean).map((campus) => [String(campus.id), campus]));
      downloadCsv({
        filename: 'payroll.csv',
        headers: ['Payroll ID', 'Employee ID', 'Employee', 'Role', 'Campus ID', 'Campus Name', 'Campus Logo URL', 'Month', 'Basic Salary', 'Allowances', 'Deductions', 'Bonuses', 'Net Amount', 'Status'],
        rows: rows.map((row) => {
          const campus = campusById.get(String(row.campusId));
          return [row.id, row.userId, row.userName, row.role, row.campusId, campus?.name, campus?.logoUrl, row.periodMonth?.slice(0, 7), row.baseSalary, row.allowances, row.deductions, row.bonuses, row.totalAmount, row.status];
        }),
      });
    } catch (error) {
      toast({ title: 'Payroll export failed', description: error?.message || 'Could not load current payroll records.', status: 'error', duration: 4000 });
    }
  };

  const releasePayslip = async (row) => {
    let currentRow = row;
    try {
      let pageNumber = 1;
      while (true) {
        const response = await financeApi.getPayrollSummary({ role: row?.role, page: pageNumber, pageSize: 200 });
        const records = Array.isArray(response?.items) ? response.items : [];
        const fresh = records.find((record) => String(record.id) === String(row?.id));
        if (fresh) {
          currentRow = { ...row, ...fresh };
          break;
        }
        if (records.length < 200) break;
        pageNumber += 1;
      }
    } catch (error) {
      toast({ title: 'Using the loaded payroll record', description: error?.message || 'Could not refresh payroll data.', status: 'warning', duration: 3000 });
    }
    row = currentRow;
    const monthLabel = row?.periodMonth ? String(row.periodMonth).slice(0, 7) : '';
    const paidOn = row?.paidOn ? String(row.paidOn).slice(0, 10) : '';
    const method = row?.paymentMethod ? String(row.paymentMethod).toUpperCase() : '';
    const banking = [row?.bankName, row?.accountNumber ? `A/C: ${row.accountNumber}` : '', row?.iban ? `IBAN: ${row.iban}` : '', row?.chequeNumber ? `Cheque: ${row.chequeNumber}` : ''].filter(Boolean).join(' · ');
    const content = `<div class="meta-grid">
      <p><strong>Payroll ID</strong><br>${escapeHtml(row?.id ?? '—')}</p>
      <p><strong>Employee</strong><br>${escapeHtml(row?.userName || '—')}</p>
      <p><strong>Employee ID</strong><br>${escapeHtml(row?.userId ?? '—')}</p>
      <p><strong>Role</strong><br>${escapeHtml(row?.role || '—')}</p>
      <p><strong>Pay Period</strong><br>${escapeHtml(monthLabel || '—')}</p>
      <p><strong>Status</strong><br>${escapeHtml(String(row?.status || '—').toUpperCase())}</p>
      <p><strong>Paid On</strong><br>${escapeHtml(paidOn || '—')}</p>
      <p><strong>Payment Method</strong><br>${escapeHtml(method || '—')}</p>
      <p><strong>Reference</strong><br>${escapeHtml(row?.transactionReference || '—')}</p>
    </div><table><thead><tr><th>Earnings and deductions</th><th>Amount</th></tr></thead><tbody>
      <tr><td>Basic salary</td><td>Rs. ${Number(row?.baseSalary || 0).toLocaleString()}</td></tr>
      <tr><td>Allowances</td><td>Rs. ${Number(row?.allowances || 0).toLocaleString()}</td></tr>
      <tr><td>Bonuses</td><td>Rs. ${Number(row?.bonuses || 0).toLocaleString()}</td></tr>
      <tr><td>Deductions</td><td>- Rs. ${Number(row?.deductions || 0).toLocaleString()}</td></tr>
      <tr><td><strong>Net salary</strong></td><td><strong>Rs. ${Number(row?.totalAmount || 0).toLocaleString()}</strong></td></tr>
    </tbody></table><p><strong>Banking</strong><br>${escapeHtml(banking || '—')}</p><p><strong>Notes</strong><br>${escapeHtml(row?.notes || '—')}</p>`;
    await openCampusPrintDocument({ campusId: row?.campusId || campusFilter || campusId, title: 'Salary Payslip', documentId: row?.id, content });
  };

  const handleEditOpen = (row) => {
    setEditingRow(row);
    setCreateForm({
      role: row.role,
      user: { id: row.userId, name: row.userName },
      periodMonth: String(row.periodMonth || '').slice(0, 7),
      baseSalary: Number(row.baseSalary || 0),
      allowances: Number(row.allowances || 0),
      deductions: Number(row.deductions || 0),
      bonuses: Number(row.bonuses || 0),
      status: row.status || 'pending',
      transactionReference: row.transactionReference || '',
      paymentMethod: row.paymentMethod || '',
      bankName: row.bankName || '',
      accountTitle: row.accountTitle || '',
      accountNumber: row.accountNumber || '',
      iban: row.iban || '',
      chequeNumber: row.chequeNumber || '',
      notes: row.notes || '',
      id: row.id,
    });
    setFormError('');
    createDisc.onOpen();
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try {
      if (row.role === 'teacher') {
        await teacherApi.deletePayroll(row.id);
      } else {
        await driversApi.deletePayroll(row.userId, row.id);
      }
      toast({ title: 'Deleted', status: 'success', duration: 2500 });
      refreshPayroll();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.response?.data?.message || 'Something went wrong', status: 'error', duration: 3000 });
    }
  };

  if (loading && payroll.length === 0) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }} textAlign="center">
        <Spinner size="xl" />
        <Text mt={3}>Loading payroll...</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center">
        <Box>
          <Heading as="h3" size="lg" mb={1}>Payroll</Heading>
          <Text color={textColorSecondary}>Manage teacher and driver salaries</Text>
        </Box>
        <ButtonGroup>
          <Button leftIcon={<MdAddCircle />} colorScheme='blue' onClick={handleCreateOpen} isDisabled={counts.teachers === 0 && counts.drivers === 0}>
            Add Salary
          </Button>
          <Button leftIcon={<MdFileDownload />} variant='outline' onClick={exportCSV}>Export CSV</Button>
          <Button leftIcon={<MdPictureAsPdf />} colorScheme='blue'>Export PDF</Button>
        </ButtonGroup>
      </Flex>

      {/* Warning if no teachers or drivers */}
      {counts.teachers === 0 && counts.drivers === 0 && (
        <NoUsersWarning
          counts={{ students: 0, teachers: 0, drivers: 0 }}
          message="Please add a Teacher or Driver before creating payroll records."
        />
      )}

      {/* Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={5} mb={5}>
        <StatCard title="Total Net" value={`Rs. ${stats.total.toLocaleString()}`} icon={MdWork} colorScheme="green" />
        <StatCard title="Pending" value={String(stats.pending)} icon={MdWork} colorScheme="orange" />
        <StatCard title="Teachers Total" value={`Rs. ${stats.teachersTotal.toLocaleString()}`} icon={FaChalkboardTeacher} colorScheme="blue" />
        <StatCard title="Drivers Total" value={`Rs. ${stats.driversTotal.toLocaleString()}`} icon={FaTruck} colorScheme="red" />
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
        <Card p={4}>
          <Heading size='md' mb={3}>Headcount by Role</Heading>
          <PieChart chartData={byRole.values} chartOptions={{ labels: byRole.labels, legend: { position: 'right' }, colors: ['#3182CE', '#DD6B20'] }} />
        </Card>
        <Card p={4}>
          <Heading size='md' mb={3}>Recent Payroll</Heading>
          <BarChart chartData={[{ name: 'Net', data: filtered.slice(0, 5).map(r => Number(r.totalAmount)) }]} chartOptions={{ xaxis: { categories: filtered.slice(0, 5).map(r => r.userName?.slice(0, 10)) }, dataLabels: { enabled: false } }} />
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <InputGroup maxW='280px'>
            <InputLeftElement pointerEvents='none'>
              <MdSearch color='gray.400' />
            </InputLeftElement>
            <Input placeholder='Search employee' value={search} onChange={(e) => setSearch(e.target.value)} />
          </InputGroup>
          <Select maxW='150px' value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value='all'>All Roles</option>
            <option value='teacher'>Teachers</option>
            <option value='driver'>Drivers</option>
          </Select>
          <Select maxW='150px' value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value='all'>All Status</option>
            <option value='pending'>Pending</option>
            <option value='processing'>Processing</option>
            <option value='paid'>Paid</option>
          </Select>
          <Input type='month' maxW='180px' value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }} />
          {isAdmin && (
            <Select maxW='200px' value={campusFilter} onChange={(e) => { setCampusFilter(e.target.value); setPage(1); }}>
              <option value='all'>All Branches</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}
        </Flex>
      </Card>

      {/* Table */}
      <Card>
        <Box overflowX='auto'>
          <Table variant='simple' size='sm'>
            <Thead position='sticky' top={0} zIndex={1} bg={useColorModeValue('gray.50', 'gray.800')}>
              <Tr>
                <Th>Month</Th>
                <Th>Employee</Th>
                <Th>Role</Th>
                <Th isNumeric>Basic</Th>
                <Th isNumeric>Allowances</Th>
                <Th isNumeric>Deductions</Th>
                <Th isNumeric>Net</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.length === 0 ? (
                <Tr><Td colSpan={9} textAlign="center" py={8} color={textColorSecondary}>No payroll records found</Td></Tr>
              ) : filtered.map((r) => (
                <Tr key={`${r.role}-${r.id}`} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                  <Td>{r.periodMonth?.slice(0, 7)}</Td>
                  <Td><Text fontWeight='600'>{r.userName}</Text></Td>
                  <Td><Badge colorScheme={r.role === 'teacher' ? 'blue' : 'orange'}>{r.role}</Badge></Td>
                  <Td isNumeric>Rs. {Number(r.baseSalary).toLocaleString()}</Td>
                  <Td isNumeric>Rs. {Number(r.allowances).toLocaleString()}</Td>
                  <Td isNumeric>Rs. {Number(r.deductions).toLocaleString()}</Td>
                  <Td isNumeric>Rs. {Number(r.totalAmount).toLocaleString()}</Td>
                  <Td><Badge colorScheme={r.status === 'paid' ? 'green' : r.status === 'processing' ? 'purple' : 'yellow'}>{r.status}</Badge></Td>
                  <Td>
                    <IconButton aria-label='View' icon={<MdRemoveRedEye />} size='xs' variant='ghost' onClick={() => { setSelected(r); viewDisc.onOpen(); }} />
                    <IconButton aria-label='Edit' icon={<MdEdit />} size='xs' variant='ghost' onClick={() => handleEditOpen(r)} />
                    <IconButton aria-label='Delete' icon={<MdDelete />} size='xs' variant='ghost' colorScheme='red' onClick={() => handleDelete(r)} />
                    <Button size='xs' variant='ghost' onClick={() => releasePayslip(r)}>Payslip</Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>

      {/* View Modal */}
      <Modal isOpen={viewDisc.isOpen} onClose={viewDisc.onClose} size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Payroll Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selected && (
              <Box>
                <Text><strong>Employee:</strong> {selected.userName}</Text>
                <Text><strong>Role:</strong> <Badge colorScheme={selected.role === 'teacher' ? 'blue' : 'orange'}>{selected.role}</Badge></Text>
                <Text><strong>Month:</strong> {selected.periodMonth?.slice(0, 7)}</Text>
                <Text><strong>Basic:</strong> Rs. {Number(selected.baseSalary).toLocaleString()}</Text>
                <Text><strong>Allowances:</strong> Rs. {Number(selected.allowances).toLocaleString()}</Text>
                <Text><strong>Deductions:</strong> Rs. {Number(selected.deductions).toLocaleString()}</Text>
                <Text><strong>Bonuses:</strong> Rs. {Number(selected.bonuses || 0).toLocaleString()}</Text>
                <Text><strong>Net:</strong> Rs. {Number(selected.totalAmount).toLocaleString()}</Text>
                <Text><strong>Status:</strong> {selected.status}</Text>
                <Text><strong>Payment Method:</strong> {selected.paymentMethod || '—'}</Text>
                {selected.transactionReference && (
                  <Text><strong>Transaction Ref:</strong> {selected.transactionReference}</Text>
                )}
                {(selected.bankName || selected.accountTitle || selected.accountNumber || selected.iban || selected.chequeNumber) && (
                  <Box mt={2}>
                    {selected.bankName && <Text><strong>Bank:</strong> {selected.bankName}</Text>}
                    {selected.accountTitle && <Text><strong>Account Title:</strong> {selected.accountTitle}</Text>}
                    {selected.accountNumber && <Text><strong>Account Number:</strong> {selected.accountNumber}</Text>}
                    {selected.iban && <Text><strong>IBAN:</strong> {selected.iban}</Text>}
                    {selected.chequeNumber && <Text><strong>Cheque No:</strong> {selected.chequeNumber}</Text>}
                  </Box>
                )}
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={createDisc.isOpen} onClose={createDisc.onClose} size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingRow ? 'Edit Salary' : 'Add Salary'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formError && (
              <Alert status='error' mb={4} borderRadius='md'>
                <AlertIcon />
                {formError}
              </Alert>
            )}

            <SimpleGrid columns={2} spacing={4} mb={4}>
              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select value={createForm.role} onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value, user: null }))}>
                  {counts.teachers > 0 && <option value='teacher'>Teacher</option>}
                  {counts.drivers > 0 && <option value='driver'>Driver</option>}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Month</FormLabel>
                <Input type='month' value={createForm.periodMonth} onChange={(e) => setCreateForm(f => ({ ...f, periodMonth: e.target.value }))} />
              </FormControl>
            </SimpleGrid>

            <UserSelector
              userType={createForm.role}
              value={createForm.user}
              onChange={(user) => setCreateForm(f => ({
                ...f,
                user,
                baseSalary: Number(user?.baseSalary || 0),
                allowances: Number(user?.allowances || 0),
                deductions: Number(user?.deductions || 0),
                paymentMethod: user?.paymentMethod || f.paymentMethod,
                bankName: user?.bankName || f.bankName,
                accountNumber: user?.accountNumber || f.accountNumber,
                iban: user?.iban || f.iban,
              }))}
              isRequired
              label="Select Employee"
              disabled={!!editingRow}
            />

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl isRequired>
                <FormLabel>Basic Salary</FormLabel>
                <NumberInput value={createForm.baseSalary} min={0} onChange={(v) => setCreateForm(f => ({ ...f, baseSalary: Number(v) || 0 }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Allowances</FormLabel>
                <NumberInput value={createForm.allowances} min={0} onChange={(v) => setCreateForm(f => ({ ...f, allowances: Number(v) || 0 }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Deductions</FormLabel>
                <NumberInput value={createForm.deductions} min={0} onChange={(v) => setCreateForm(f => ({ ...f, deductions: Number(v) || 0 }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Bonuses</FormLabel>
                <NumberInput value={createForm.bonuses} min={0} onChange={(v) => setCreateForm(f => ({ ...f, bonuses: Number(v) || 0 }))}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={createForm.status} onChange={(e) => setCreateForm(f => ({ ...f, status: e.target.value }))}>
                  <option value='pending'>Pending</option>
                  <option value='processing'>Processing</option>
                  <option value='paid'>Paid</option>
                  <option value='failed'>Failed</option>
                  <option value='cancelled'>Cancelled</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Transaction Ref</FormLabel>
                <Input value={createForm.transactionReference} onChange={(e) => setCreateForm(f => ({ ...f, transactionReference: e.target.value }))} placeholder='Optional' />
              </FormControl>
            </SimpleGrid>

            <SimpleGrid columns={2} spacing={4} mt={4}>
              <FormControl>
                <FormLabel>Payment Method</FormLabel>
                <Select value={createForm.paymentMethod} onChange={(e) => setCreateForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value=''>Select</option>
                  <option value='cash'>Cash</option>
                  <option value='bank'>Bank Transfer</option>
                  <option value='cheque'>Cheque</option>
                </Select>
              </FormControl>

              {createForm.paymentMethod === 'cheque' ? (
                <FormControl>
                  <FormLabel>Cheque No</FormLabel>
                  <Input value={createForm.chequeNumber} onChange={(e) => setCreateForm(f => ({ ...f, chequeNumber: e.target.value }))} placeholder='Required for cheque' />
                </FormControl>
              ) : (
                <FormControl>
                  <FormLabel>Account Title</FormLabel>
                  <Input value={createForm.accountTitle} onChange={(e) => setCreateForm(f => ({ ...f, accountTitle: e.target.value }))} placeholder='Optional' />
                </FormControl>
              )}
            </SimpleGrid>

            {(createForm.paymentMethod === 'bank' || createForm.paymentMethod === 'cheque') && (
              <SimpleGrid columns={2} spacing={4} mt={4}>
                <FormControl>
                  <FormLabel>Bank Name</FormLabel>
                  <Input value={createForm.bankName} onChange={(e) => setCreateForm(f => ({ ...f, bankName: e.target.value }))} placeholder='e.g., HBL / UBL' />
                </FormControl>
                <FormControl>
                  <FormLabel>Account Number</FormLabel>
                  <Input value={createForm.accountNumber} onChange={(e) => setCreateForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder='Optional' />
                </FormControl>
                <FormControl>
                  <FormLabel>IBAN</FormLabel>
                  <Input value={createForm.iban} onChange={(e) => setCreateForm(f => ({ ...f, iban: e.target.value }))} placeholder='Optional' />
                </FormControl>
              </SimpleGrid>
            )}

            <Box mt={4} p={3} bg={useColorModeValue('blue.50', 'blue.900')} borderRadius='md'>
              <Text fontWeight='600'>Net Salary: Rs. {computeNet(createForm).toLocaleString()}</Text>
            </Box>

            <FormControl mt={4}>
              <FormLabel>Notes</FormLabel>
              <Input value={createForm.notes} onChange={(e) => setCreateForm(f => ({ ...f, notes: e.target.value }))} placeholder='Optional notes' />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={createDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={handleCreate} isLoading={creating} isDisabled={!createForm.user}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
