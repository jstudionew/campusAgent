import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Heading, Text, SimpleGrid, Icon, Badge, Button, ButtonGroup, useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Select, Input, IconButton, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, FormControl, FormLabel, NumberInput, NumberInputField } from '@chakra-ui/react';
import { MdAssignment, MdPlaylistAdd, MdEdit, MdFileDownload, MdRemoveRedEye } from 'react-icons/md';
import Card from '../../../../components/card/Card';
import MiniStatistics from '../../../../components/card/MiniStatistics';
import IconBox from '../../../../components/icons/IconBox';
import BarChart from '../../../../components/charts/BarChart';
import PieChart from '../../../../components/charts/PieChart';
import * as masterDataApi from '../../../../services/api/masterData';
import { useAuth } from '../../../../contexts/AuthContext';
import { downloadCsv, loadCampusForExport } from '../../../../utils/campusExports';

const normalizeRuleRows = (value) => {
  const items = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];
  return items.map((row, index) => ({
    id: row.id ?? index,
    class: row.class ?? row.class_name ?? row.className ?? String(row.fee_type || 'Class'),
    fee_type: row.fee_type ?? row.feeType ?? 'Tuition',
    amount: Number(row.amount || 0),
    feeType: row.fee_type ?? row.feeType ?? 'Tuition',
    frequency: row.frequency ?? 'Monthly',
    discount: Number(row.discount || 0),
    tuition: row.tuition ?? Number(row.amount || 0),
    transport: row.transport ?? 0,
    exam: row.exam ?? 0,
    misc: row.misc ?? 0,
  }));
};

export default function FeeStructure() {
  const { campusId } = useAuth();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');
  const [selected, setSelected] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const viewDisc = useDisclosure();
  const editDisc = useDisclosure();
  const copyDisc = useDisclosure();
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ id: null, class: '', tuition: 0, transport: 0, exam: 0, misc: 0, discount: 0, fee_type: 'Tuition', amount: 0, frequency: 'Monthly' });
  const [copyTarget, setCopyTarget] = useState('');
  const fileRef = useRef(null);
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await masterDataApi.getFeeRules();
        setRows(normalizeRuleRows(res));
      } catch (error) {
        console.error('Failed to load fee rules', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const source = rows.length ? rows : [];
    const tuitionTotal = source.reduce((sum, row) => sum + Number(row.tuition || row.amount || 0), 0);
    const transportTotal = source.reduce((sum, row) => sum + Number(row.transport || 0), 0);
    return {
      classes: source.length,
      avgTuition: source.length ? Math.round(tuitionTotal / source.length) : 0,
      transport: transportTotal,
    };
  }, [rows]);

  const headTotals = useMemo(() => {
    const t = rows.reduce((acc, r) => {
      acc.tuition += Number(r.tuition || r.amount || 0);
      acc.transport += Number(r.transport || 0);
      acc.exam += Number(r.exam || 0);
      acc.misc += Number(r.misc || 0);
      return acc;
    }, { tuition: 0, transport: 0, exam: 0, misc: 0 });
    const gross = t.tuition + t.transport + t.exam + t.misc;
    const avgDiscount = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.discount || 0), 0) / rows.length) : 0;
    return { ...t, gross, avgDiscount };
  }, [rows]);

  const saveRule = async () => {
    try {
      const payload = {
        fee_type: form.fee_type || 'Tuition',
        amount: Number(form.amount || form.tuition || 0),
        frequency: form.frequency || 'Monthly',
        class_id: form.class || null,
        isShared: true,
      };

      if (form.id) {
        await masterDataApi.updateFeeRule(form.id, payload);
      } else {
        await masterDataApi.createFeeRule(payload);
      }

      const res = await masterDataApi.getFeeRules();
      setRows(normalizeRuleRows(res));
      editDisc.onClose();
    } catch (error) {
      console.error('Failed to save fee rule', error);
    }
  };

  const exportCSV = async () => {
    const header = ['Class','Tuition','Transport','Exam','Misc','Discount%','Total','Net'];
    const data = rows.map(r => { const total = Number(r.tuition || r.amount || 0) + Number(r.transport || 0) + Number(r.exam || 0) + Number(r.misc || 0); const net = Math.round(total * (1 - (Number(r.discount || 0) / 100))); return [r.class, Number(r.tuition || r.amount || 0), Number(r.transport || 0), Number(r.exam || 0), Number(r.misc || 0), Number(r.discount || 0), total, net]; });
    const campus = await loadCampusForExport(campusId);
    downloadCsv({
      filename: 'fee_structure.csv',
      headers: ['Campus ID', 'Campus Name', 'Campus Logo URL', 'Fee Rule ID', ...header],
      rows: rows.map((row, index) => [campus?.id || campusId, campus?.name, campus?.logoUrl, row.id ?? index, ...data[index]]),
    });
  };

  const importJSON = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data = Array.isArray(parsed) ? parsed : parsed?.feeRules;
      if (!Array.isArray(data)) throw new Error('Invalid JSON');
      const mapped = data.map((d) => ({
        class: String(d.class || d.fee_type || 'Class'),
        tuition: Number(d.tuition || d.amount || 0),
        transport: Number(d.transport || 0),
        exam: Number(d.exam || 0),
        misc: Number(d.misc || 0),
        discount: Number(d.discount || 0),
      }));
      setRows(mapped);
    } catch (error) {
      console.error('Import error', error);
    }
  };

  const exportJSON = async () => {
    const campus = await loadCampusForExport(campusId);
    const exportPayload = {
      campus: { id: campus?.id || campusId || null, name: campus?.name || null, logoUrl: campus?.logoUrl || null },
      developedBy: { name: 'J-Studio', website: 'www.jstudio.tech', contact: '0307-7763195' },
      feeRules: rows,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'fee_structure.json'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Flex mb={5} justify="space-between" align="center">
        <Box>
          <Heading as="h3" size="lg" mb={1}>Fee Structure</Heading>
          <Text color={textColorSecondary}>{loading ? 'Loading live fee rules…' : 'Live fee rules from master data'}</Text>
        </Box>
        <ButtonGroup>
          <Button leftIcon={<MdPlaylistAdd />} colorScheme='blue' onClick={() => { setForm({ id: null, class: `Class ${rows.length + 1}`, tuition: 0, transport: 0, exam: 0, misc: 0, discount: 0, fee_type: 'Tuition', amount: 0, frequency: 'Monthly' }); editDisc.onOpen(); }}>Add Structure</Button>
          <Button variant='outline' onClick={copyDisc.onOpen}>Copy From Class</Button>
          <Button leftIcon={<MdFileDownload />} variant='outline' colorScheme='blue' onClick={exportCSV}>Export CSV</Button>
          <Button onClick={exportJSON}>Export JSON</Button>
          <Button colorScheme='purple' onClick={() => fileRef.current?.click()}>Import JSON</Button>
          <input ref={fileRef} type='file' accept='application/json' style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); }} />
        </ButtonGroup>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mb={5}>
        <MiniStatistics name="Classes Covered" value={String(totals.classes)} startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#00c6ff 0%,#0072ff 100%)' icon={<Icon as={MdAssignment} w='28px' h='28px' color='white' />} />} />
        <MiniStatistics name="Avg Tuition" value={`Rs. ${totals.avgTuition.toLocaleString()}`} startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#11998e 0%,#38ef7d 100%)' icon={<Icon as={MdAssignment} w='28px' h='28px' color='white' />} />} />
        <MiniStatistics name="Total Transport" value={`Rs. ${totals.transport.toLocaleString()}`} startContent={<IconBox w='56px' h='56px' bg='linear-gradient(90deg,#FDBB2D 0%,#22C1C3 100%)' icon={<Icon as={MdAssignment} w='28px' h='28px' color='white' />} />} />
      </SimpleGrid>

      <Card p={4} mb={5}>
        <Flex gap={3} direction={{ base: 'column', md: 'row' }} align={{ md: 'center' }}>
          <Select maxW='220px' value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value='all'>All Rules</option>
            {rows.map((row) => (
              <option key={row.id} value={row.class}>{row.class}</option>
            ))}
          </Select>
          <Input maxW='280px' placeholder='Search fee rule' />
        </Flex>
      </Card>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} mb={5}>
        <Card p={4}>
          <Heading size='md' mb={3}>Rule Totals</Heading>
          <BarChart height={220} chartData={[{ name: 'Amount', data: [headTotals.tuition, headTotals.transport, headTotals.exam, headTotals.misc] }]} chartOptions={{ xaxis: { categories: ['Tuition', 'Transport', 'Exam', 'Misc'] }, colors: ['#3182CE'], dataLabels: { enabled: false } }} />
        </Card>
        <Card p={4}>
          <Heading size='md' mb={3}>Gross vs Discount</Heading>
          <PieChart chartData={[headTotals.gross, Math.round(headTotals.gross * (headTotals.avgDiscount / 100))]} chartOptions={{ labels: ['Gross', 'Discount Est.'], colors: ['#01B574', '#E53E3E'], legend: { position: 'right' } }} />
        </Card>
      </SimpleGrid>

      <Card>
        <Box overflow='hidden'>
          <Box maxH='420px' overflowY='auto'>
            <Table variant='simple'>
              <Thead position='sticky' top={0} zIndex={1} bg={useColorModeValue('gray.50', 'gray.800')}>
                <Tr>
                  <Th>Rule</Th>
                  <Th isNumeric>Amount</Th>
                  <Th>Frequency</Th>
                  <Th isNumeric>Discount %</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((r) => {
                  if (selected !== 'all' && selected !== r.class) return null;
                  return (
                    <Tr key={r.id} _hover={{ bg: rowHoverBg }}>
                      <Td><Badge colorScheme='blue'>{r.fee_type || r.class}</Badge></Td>
                      <Td isNumeric>Rs. {Number(r.amount || r.tuition || 0).toLocaleString()}</Td>
                      <Td>{r.frequency || 'Monthly'}</Td>
                      <Td isNumeric>{Number(r.discount || 0)}%</Td>
                      <Td>
                        <IconButton aria-label='View' icon={<MdRemoveRedEye />} size='sm' variant='ghost' onClick={() => { setActive(r); viewDisc.onOpen(); }} />
                        <IconButton aria-label='Edit' icon={<MdEdit />} size='sm' variant='ghost' onClick={() => { setForm({ ...r, id: r.id, class: r.class || '', fee_type: r.fee_type || r.feeType || 'Tuition', amount: Number(r.amount || r.tuition || 0), tuition: Number(r.tuition || r.amount || 0), transport: Number(r.transport || 0), exam: Number(r.exam || 0), misc: Number(r.misc || 0), discount: Number(r.discount || 0), frequency: r.frequency || 'Monthly' }); editDisc.onOpen(); }} />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Card>

      <Modal isOpen={viewDisc.isOpen} onClose={viewDisc.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Fee Rule Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {active && (
              <Box>
                <Text><strong>Rule:</strong> {active.fee_type || active.class}</Text>
                <Text><strong>Amount:</strong> Rs. {Number(active.amount || active.tuition || 0).toLocaleString()}</Text>
                <Text><strong>Frequency:</strong> {active.frequency || 'Monthly'}</Text>
                <Text><strong>Discount:</strong> {Number(active.discount || 0)}%</Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={viewDisc.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editDisc.isOpen} onClose={editDisc.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{form.id ? 'Edit Rule' : 'Add Rule'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Rule Name</FormLabel>
              <Input value={form.fee_type} onChange={(e) => setForm((f) => ({ ...f, fee_type: e.target.value }))} />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>Class / Group</FormLabel>
              <Input value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))} />
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>Amount</FormLabel>
              <NumberInput value={form.amount} min={0} onChange={(v) => setForm((f) => ({ ...f, amount: Number(v) || 0, tuition: Number(v) || 0 }))}><NumberInputField /></NumberInput>
            </FormControl>
            <FormControl mb={3}>
              <FormLabel>Frequency</FormLabel>
              <Select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}>
                <option value='Monthly'>Monthly</option>
                <option value='One-Time'>One-Time</option>
                <option value='Annual'>Annual</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Discount %</FormLabel>
              <NumberInput value={form.discount} min={0} max={100} onChange={(v) => setForm((f) => ({ ...f, discount: Number(v) || 0 }))}><NumberInputField /></NumberInput>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={editDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={saveRule}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={copyDisc.isOpen} onClose={copyDisc.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Copy From Rule</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>From</FormLabel>
              <Select value={copyTarget} onChange={(e) => setCopyTarget(e.target.value)}>
                <option value=''>Select rule</option>
                {rows.map((r) => <option key={r.id} value={r.id}>{r.fee_type || r.class}</option>)}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>To (New Rule)</FormLabel>
              <Input placeholder='e.g., Grade 8' value={form.fee_type} onChange={(e) => setForm((f) => ({ ...f, fee_type: e.target.value }))} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={copyDisc.onClose}>Cancel</Button>
            <Button colorScheme='blue' onClick={() => {
              const src = rows.find((r) => String(r.id) === String(copyTarget));
              if (!src) { copyDisc.onClose(); return; }
              setForm({
                id: null,
                class: form.class || `${src.class || 'Class'} Copy`,
                tuition: Number(src.tuition || src.amount || 0),
                transport: Number(src.transport || 0),
                exam: Number(src.exam || 0),
                misc: Number(src.misc || 0),
                discount: Number(src.discount || 0),
                fee_type: form.fee_type || src.fee_type || 'Tuition',
                amount: Number(src.amount || src.tuition || 0),
                frequency: src.frequency || 'Monthly',
              });
              copyDisc.onClose();
              editDisc.onOpen();
            }}>Copy</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
