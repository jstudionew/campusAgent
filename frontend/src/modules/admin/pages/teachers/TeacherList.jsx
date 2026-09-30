import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Badge,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  SimpleGrid,
  Select,
  useColorModeValue,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card.js';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import StatCard from '../../../../components/card/StatCard';
import { SearchIcon, DownloadIcon, ViewIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import {
  MdMoreVert,
  MdPeople,
  MdSchool,
  MdPersonAdd,
} from 'react-icons/md';
import useApi from '../../../../hooks/useApi';
import { teachersApi, campusesApi, classesApi } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { syncTeacherClassSections } from '../../../../utils/teacherClassSections';
import { toDateInputValue } from '../../../../utils/dateValues';
import TeacherDetailsModal from './TeacherDetailsModal';
import TeacherEditModal from './TeacherEditModal';

function TeacherList() {
  const { campusId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editAvatarData, setEditAvatarData] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const detailsDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();
  const editDisclosure = useDisclosure();
  const cancelDeleteRef = useRef();
  const [campuses, setCampuses] = useState([]);
  const toast = useToast();

  // Color mode values
  const textColor = useColorModeValue('gray.800', 'white');
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');
  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const tableHeaderBg = useColorModeValue('gray.50', 'gray.800');
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');
  const dividerColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const badgeVariant = useColorModeValue('subtle', 'solid');
  const {
    execute: fetchTeachers,
    data: teachersResponse,
    loading: loadingTeachers,
    error: teachersError,
  } = useApi(teachersApi.list);

  const {
    execute: removeTeacher,
    loading: removingTeacher,
  } = useApi((id) => teachersApi.remove(id));

  const {
    execute: updateTeacher,
    loading: updatingTeacher,
  } = useApi((id, payload) => teachersApi.update(id, payload));

  const refreshTeachers = useCallback(() => {
    fetchTeachers({ page: 1, pageSize: 200, campusId });
  }, [fetchTeachers, campusId]);

  useEffect(() => {
    refreshTeachers();
    campusesApi.list({ pageSize: 100 })
      .then(res => setCampuses(res.rows || []))
      .catch(err => console.error('Failed to fetch campuses', err));
  }, [refreshTeachers]);

  const teachers = useMemo(() => teachersResponse?.rows || [], [teachersResponse]);
  const totalTeachers = teachersResponse?.total ?? teachers.length;

  const departments = useMemo(() => {
    const set = new Set();
    teachers.forEach((t) => {
      if (t?.department) set.add(t.department);
    });
    return Array.from(set);
  }, [teachers]);

  const subjects = useMemo(() => {
    const set = new Set();
    teachers.forEach((t) => {
      if (t?.subject) set.add(t.subject);
      if (Array.isArray(t?.subjects)) {
        t.subjects.filter(Boolean).forEach((subj) => set.add(subj));
      }
    });
    return Array.from(set);
  }, [teachers]);

  const statuses = useMemo(() => {
    const set = new Set();
    teachers.forEach((t) => {
      const status = (t?.employmentStatus || t?.status || '').trim();
      if (status) set.add(status);
    });
    return Array.from(set);
  }, [teachers]);

  const statusOptions = useMemo(() => {
    const base = ['active', 'on leave', 'on_leave', 'resigned'];
    const set = new Set(base);
    statuses.forEach((s) => set.add(s));
    return Array.from(set);
  }, [statuses]);

  const currencyOptions = useMemo(() => ['PKR', 'USD', 'EUR'], []);

  const formatLabel = (value) => {
    if (!value) return '';
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const filteredTeachers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const name = (teacher.name || '').toLowerCase();
      const email = (teacher.email || '').toLowerCase();
      const subject = (teacher.subject || '').toLowerCase();
      const employeeId = (teacher.employeeId || '').toLowerCase();
      const dept = (teacher.department || '').toLowerCase();
      const statusValues = [teacher.employmentStatus, teacher.status]
        .map((s) => (s || '').toLowerCase())
        .filter(Boolean);
      const subjectValues = Array.isArray(teacher.subjects)
        ? teacher.subjects.map((s) => (s || '').toLowerCase())
        : [];

      const matchesSearch = !term ||
        name.includes(term) ||
        email.includes(term) ||
        subject.includes(term) ||
        employeeId.includes(term);
      const matchesDepartment = !departmentFilter || dept === departmentFilter.toLowerCase();
      const matchesStatus = !statusFilter || statusValues.includes(statusFilter.toLowerCase());
      const matchesSubject = !subjectFilter ||
        subjectFilter.toLowerCase() === subject ||
        subjectValues.includes(subjectFilter.toLowerCase());

      // Campus filter (safeguard)
      const matchesCampus = !campusId || !teacher.campusId || String(teacher.campusId) === String(campusId);

      return matchesSearch && matchesDepartment && matchesStatus && matchesSubject && matchesCampus;
    });
  }, [teachers, searchTerm, departmentFilter, statusFilter, subjectFilter, campusId]);

  const stats = useMemo(() => {
    const activeCount = teachers.filter((t) => (t.employmentStatus || t.status || '').toLowerCase() === 'active').length;
    const leaveCount = teachers.filter((t) => (t.employmentStatus || t.status || '').toLowerCase().includes('leave')).length;
    const departmentCount = new Set(teachers.map((t) => t.department).filter(Boolean)).size;
    return {
      total: totalTeachers,
      active: activeCount,
      onLeave: leaveCount,
      departments: departmentCount,
    };
  }, [teachers, totalTeachers]);

  const statusColor = (status) => {
    const value = (status || '').toLowerCase();
    if (value === 'active') return 'green';
    if (value.includes('leave')) return 'orange';
    if (value.includes('resign')) return 'red';
    return 'gray';
  };

  const formatCurrency = (amount, currency = 'PKR') => {
    if (amount === null || amount === undefined || amount === '') return '-';
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) return amount;
    return `${currency} ${numeric.toLocaleString()}`;
  };

  const buildEditForm = useCallback((teacher) => ({
    name: teacher?.name || '',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    employeeId: teacher?.employeeId || '',
    department: teacher?.department || '',
    designation: teacher?.designation || '',
    qualification: teacher?.qualification || '',
    specialization: teacher?.specialization || '',
    subject: teacher?.subject || '',
    gender: teacher?.gender || '',
    dob: toDateInputValue(teacher?.dob),
    bloodGroup: teacher?.bloodGroup || '',
    religion: teacher?.religion || '',
    nationalId: teacher?.nationalId || '',
    subjects: Array.isArray(teacher?.subjects) ? teacher.subjects.join(', ') : '',
    classes: Array.isArray(teacher?.classes) ? teacher.classes.join(', ') : '',
    employmentStatus: teacher?.employmentStatus || teacher?.status || 'active',
    employmentType: teacher?.employmentType || '',
    joiningDate: toDateInputValue(teacher?.joiningDate),
    probationEndDate: toDateInputValue(teacher?.probationEndDate),
    contractEndDate: toDateInputValue(teacher?.contractEndDate),
    experienceYears: teacher?.experienceYears ?? '',
    workHoursPerWeek: teacher?.workHoursPerWeek ?? '',
    baseSalary: teacher?.baseSalary ?? '',
    allowances: teacher?.allowances ?? '',
    deductions: teacher?.deductions ?? '',
    salary: teacher?.salary ?? '',
    currency: teacher?.currency || 'PKR',
    payFrequency: teacher?.payFrequency || 'monthly',
    paymentMethod: teacher?.paymentMethod || '',
    bankName: teacher?.bankName || '',
    accountNumber: teacher?.accountNumber || '',
    iban: teacher?.iban || '',
    emergencyName: teacher?.emergencyName || '',
    emergencyRelation: teacher?.emergencyRelation || '',
    emergencyPhone: teacher?.emergencyPhone || '',
    address1: teacher?.address1 || '',
    address2: teacher?.address2 || '',
    city: teacher?.city || '',
    state: teacher?.state || '',
    postalCode: teacher?.postalCode || '',
    campusId: teacher?.campusId || '',
  }), []);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) setEditErrors((prev) => ({ ...prev, [name]: null }));
  };

  const parseListField = (value) => {
    if (value === null || value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed.split(',').map((entry) => entry.trim()).filter(Boolean);
  };

  const parseNumberField = (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const fileToBase64 = useCallback((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || '');
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  }), []);

  const validateEditForm = () => {
    if (!editForm) return false;
    const errors = {};
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (!editForm.email.trim()) errors.email = 'Email is required';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openDetails = (teacher) => {
    setSelectedTeacher(teacher);
    detailsDisclosure.onOpen();
  };

  const openEdit = (teacher) => {
    setEditTeacher(teacher);
    setEditForm(buildEditForm(teacher));
    setEditAvatarPreview(teacher?.avatar || teacher?.photo || '');
    setEditAvatarData(null);
    setEditErrors({});
    editDisclosure.onOpen();
  };

  const closeEdit = () => {
    editDisclosure.onClose();
    setEditTeacher(null);
    setEditForm(null);
    setEditErrors({});
    setEditAvatarPreview('');
    setEditAvatarData(null);
  };

  const handleEditAvatarChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setEditAvatarPreview(base64);
      setEditAvatarData(base64);
    } catch (error) {
      toast({
        title: 'Image upload failed',
        description: error?.message || 'Could not process the selected image.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      event.target.value = '';
    }
  }, [fileToBase64, toast]);

  const handleEditSubmit = async (e) => {
    e?.preventDefault();
    if (!editTeacher || !editForm) return;
    if (!validateEditForm()) return;

    const payload = {
      name: editForm.name.trim(),
      email: editForm.email.trim().toLowerCase(),
    };

    const assign = (field, value) => {
      if (value === undefined) return;
      payload[field] = value;
    };

    assign('phone', editForm.phone.trim() || undefined);
    assign('employeeId', editForm.employeeId?.trim() || undefined);
    assign('department', editForm.department.trim() || undefined);
    assign('designation', editForm.designation.trim() || undefined);
    assign('qualification', editForm.qualification.trim() || undefined);
    assign('subject', editForm.subject.trim() || undefined);
    assign('gender', editForm.gender || null);
    assign('dob', editForm.dob || null);
    assign('bloodGroup', editForm.bloodGroup || null);
    assign('religion', editForm.religion.trim() || null);
    assign('nationalId', editForm.nationalId.trim() || null);
    assign('employmentStatus', editForm.employmentStatus || undefined);
    assign('employmentType', editForm.employmentType.trim() || undefined);
    assign('joiningDate', editForm.joiningDate || null);
    assign('probationEndDate', editForm.probationEndDate || null);
    assign('contractEndDate', editForm.contractEndDate || null);
    assign('specialization', editForm.specialization.trim() || undefined);
    assign('currency', editForm.currency || undefined);
    assign('payFrequency', editForm.payFrequency || undefined);
    assign('paymentMethod', editForm.paymentMethod.trim() || undefined);
    assign('bankName', editForm.bankName.trim() || undefined);
    assign('accountNumber', editForm.accountNumber.trim() || undefined);
    assign('iban', editForm.iban.trim() || undefined);
    assign('emergencyName', editForm.emergencyName.trim() || undefined);
    assign('emergencyRelation', editForm.emergencyRelation.trim() || undefined);
    assign('emergencyPhone', editForm.emergencyPhone.trim() || undefined);
    assign('address1', editForm.address1.trim() || undefined);
    assign('address2', editForm.address2.trim() || undefined);
    assign('city', editForm.city.trim() || undefined);
    assign('state', editForm.state.trim() || undefined);
    assign('postalCode', editForm.postalCode.trim() || undefined);
    assign('campusId', editForm.campusId || undefined);

    assign('subjects', parseListField(editForm.subjects));
    assign('classes', parseListField(editForm.classes));
    assign('baseSalary', parseNumberField(editForm.baseSalary));
    assign('allowances', parseNumberField(editForm.allowances));
    assign('deductions', parseNumberField(editForm.deductions));
    assign('salary', parseNumberField(editForm.salary));
    assign('experienceYears', parseNumberField(editForm.experienceYears));
    assign('workHoursPerWeek', parseNumberField(editForm.workHoursPerWeek));
    assign('avatar', editAvatarData || undefined);

    const { error } = await updateTeacher(editTeacher.id, payload);
    if (error) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update teacher.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      await syncTeacherClassSections({
        labels: payload.classes,
        campusId: editForm.campusId || editTeacher.campusId || campusId,
        classesApi,
      });
    } catch (syncError) {
      toast({
        title: 'Teacher updated, but class sections were not fully saved',
        description: syncError?.message || 'Reopen Edit Teacher and save the class list to retry.',
        status: 'warning',
        duration: 7000,
        isClosable: true,
      });
    }

    toast({
      title: 'Teacher updated',
      description: `${payload.name} has been updated.`,
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    closeEdit();
    refreshTeachers();
  };

  const confirmDelete = (teacher) => {
    setTeacherToDelete(teacher);
    deleteDisclosure.onOpen();
  };

  const closeDeleteDialog = () => {
    deleteDisclosure.onClose();
    setTeacherToDelete(null);
  };

  const handleDelete = async () => {
    if (!teacherToDelete) return;
    const { error } = await removeTeacher(teacherToDelete.id);
    if (error) {
      toast({
        title: 'Failed to delete teacher',
        description: error?.message || 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    toast({
      title: 'Teacher deleted',
      description: `${teacherToDelete.name || 'Teacher'} has been removed.`,
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    closeDeleteDialog();
    refreshTeachers();
  };

  return (
    <Box
      pt={{ base: '130px', md: '80px', xl: '80px' }}
      px={4}
      bg={pageBg}
      minH="100vh"
    >
      {/* Page Header */}
      <Flex
        mb={6}
        justify="space-between"
        align="center"
        direction={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Box>
          <Heading
            size="lg"
            color={textColor}
            mb={2}
          >
            Teachers Management
          </Heading>
          <Text color={textColorSecondary} fontSize="md">
            Manage teaching staff and their information ({filteredTeachers.length} shown of {totalTeachers})
          </Text>
        </Box>

      </Flex>

      {/* Statistics Cards - redesigned */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        <StatCard
          title='Total Teachers'
          value={String(stats.total || 0)}
          icon={MdPeople}
          colorScheme='blue'
          trend='up'
          trendValue={2}
        />
        <StatCard
          title='Active Teachers'
          value={String(stats.active || 0)}
          icon={MdSchool}
          colorScheme='green'
          trend='up'
          trendValue={1}
        />
        <StatCard
          title='On Leave'
          value={String(stats.onLeave || 0)}
          icon={MdPersonAdd}
          colorScheme='orange'
          trend='up'
          trendValue={0}
        />
        <StatCard
          title='Departments'
          value={String(stats.departments || 0)}
          icon={MdSchool}
          colorScheme='purple'
          trend='up'
          trendValue={0}
        />
      </SimpleGrid>

      {/* Search and Filters */}
      <Card mb={6}>
        <Box p={4}>
          <Flex gap={4} direction={{ base: 'column', md: 'row' }} flexWrap='wrap'>
            <InputGroup flex={2}>
              <InputLeftElement>
                <SearchIcon color={textColorSecondary} />
              </InputLeftElement>
              <Input
                placeholder="Search teachers by name, email, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
              />
            </InputGroup>
            <Select
              placeholder="All Subjects"
              maxW="200px"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              {subjects.map((subj) => (
                <option key={subj} value={subj.toLowerCase()}>{subj}</option>
              ))}
            </Select>
            <Select
              placeholder="All Departments"
              maxW="200px"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {departments.map((dept) => (
                <option key={dept} value={dept.toLowerCase()}>{dept}</option>
              ))}
            </Select>
            <Select
              placeholder="All Status"
              maxW="200px"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map((status) => (
                <option key={status} value={status.toLowerCase()}>{status}</option>
              ))}
            </Select>
          </Flex>
          {teachersError && (
            <Alert status='error' mt={4} borderRadius='md'>
              <AlertIcon />
              {teachersError.message || 'Failed to load teachers'}
            </Alert>
          )}
        </Box>
      </Card>

      {/* Teachers Table */}
      <Card>
        <Box p={4}>
          <Flex justify="space-between" align="center">
            <Heading size="md" color={textColor}>
              Teachers List ({filteredTeachers.length})
            </Heading>
            <HStack>
              <Button size="sm" variant="outline" leftIcon={<DownloadIcon />}>
                Export
              </Button>
            </HStack>
          </Flex>
        </Box>

        <Box pt={0} px={4} pb={4}>
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg={tableHeaderBg}>
                <Tr>
                  <Th color={textColorSecondary}>Teacher</Th>
                  <Th color={textColorSecondary}>Contact</Th>
                  <Th color={textColorSecondary}>Subject</Th>
                  <Th color={textColorSecondary}>Department</Th>
                  <Th color={textColorSecondary}>Experience</Th>
                  <Th color={textColorSecondary}>Status</Th>
                  <Th color={textColorSecondary}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loadingTeachers && (
                  <Tr>
                    <Td colSpan={7}>
                      <Center py={10}>
                        <Spinner />
                      </Center>
                    </Td>
                  </Tr>
                )}
                {!loadingTeachers && filteredTeachers.map((teacher) => {
                  const primarySubject = teacher.subject || (Array.isArray(teacher.subjects) ? teacher.subjects[0] : '');
                  const experienceLabel = teacher.experienceYears ? `${teacher.experienceYears} yrs` : teacher.experience || '—';
                  const teacherStatus = teacher.employmentStatus || teacher.status;
                  return (
                    <Tr key={teacher.id} _hover={{ bg: rowHoverBg }}>
                      <Td>
                        <Flex align="center">
                          <Avatar
                            size="sm"
                            name={teacher.name}
                            src={teacher.avatar || teacher.photo || undefined}
                            mr={3}
                          />
                          <Box>
                            <Text fontWeight="bold" color={textColor}>
                              {teacher.name || '—'}
                            </Text>
                            <Text fontSize="sm" color={textColorSecondary}>
                              {teacher.qualification || '—'}
                            </Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td>
                        <Box>
                          <Text fontSize="sm" color={textColor}>
                            {teacher.email || '—'}
                          </Text>
                          <Text fontSize="sm" color={textColorSecondary}>
                            {teacher.phone || '—'}
                          </Text>
                        </Box>
                      </Td>
                      <Td>
                        {primarySubject ? (
                          <Badge colorScheme="blue" variant={badgeVariant}>
                            {primarySubject}
                          </Badge>
                        ) : (
                          <Text fontSize="sm" color={textColorSecondary}>—</Text>
                        )}
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={textColor}>
                          {teacher.department || '—'}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color={textColor}>
                          {experienceLabel}
                        </Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={statusColor(teacherStatus)}
                          variant={badgeVariant}
                        >
                          {teacherStatus || '—'}
                        </Badge>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<MdMoreVert />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem icon={<ViewIcon />} onClick={() => openDetails(teacher)}>View Details</MenuItem>
                            <MenuItem icon={<EditIcon />} onClick={() => openEdit(teacher)}>Edit Teacher</MenuItem>
                            <MenuItem icon={<DeleteIcon />} color="red.500" onClick={() => confirmDelete(teacher)}>
                              Delete Teacher
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>

          {/* Pagination */}
          {!loadingTeachers && filteredTeachers.length > 0 && (
            <Flex justify="space-between" align="center" pt={4} borderTop="1px" borderColor={dividerColor} mt={4}>
              <Text fontSize="sm" color={textColorSecondary}>
                Showing 1 to {filteredTeachers.length} of {filteredTeachers.length} teachers
              </Text>
              <HStack>
                <Button size="sm" variant="outline" isDisabled>
                  Previous
                </Button>
                <Button size="sm" colorScheme="blue">
                  1
                </Button>
                <Button size="sm" variant="outline" isDisabled>
                  Next
                </Button>
              </HStack>
            </Flex>
          )}

          {/* No Results */}
          {!loadingTeachers && filteredTeachers.length === 0 && (
            <Box textAlign="center" py={10}>
              <Icon as={MdPeople} boxSize={12} color={textColorSecondary} mb={4} />
              <Text fontSize="lg" color={textColor} mb={2}>
                No teachers found
              </Text>
              <Text fontSize="sm" color={textColorSecondary}>
                Try adjusting your search criteria or add a new teacher
              </Text>
            </Box>
          )}
        </Box>
      </Card>

      <TeacherDetailsModal
        isOpen={detailsDisclosure.isOpen}
        onClose={detailsDisclosure.onClose}
        teacher={selectedTeacher}
        statusColor={statusColor}
        formatCurrency={formatCurrency}
      />

      <TeacherEditModal
        isOpen={editDisclosure.isOpen}
        onClose={closeEdit}
        form={editForm}
        errors={editErrors}
        onChange={handleEditChange}
        onSubmit={handleEditSubmit}
        statusOptions={statusOptions}
        currencyOptions={currencyOptions}
        formatLabel={formatLabel}
        isSubmitting={updatingTeacher}
        avatarPreview={editAvatarPreview}
        onAvatarChange={handleEditAvatarChange}
        campusOptions={campuses}
      />

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={closeDeleteDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize='lg' fontWeight='bold'>
              Delete Teacher
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete {teacherToDelete?.name || 'this teacher'}? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={closeDeleteDialog} mr={3}>
                Cancel
              </Button>
              <Button colorScheme='red' onClick={handleDelete} isLoading={removingTeacher}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default TeacherList;
