import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  Select,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdChevronLeft, MdChevronRight, MdSearch, MdSwapVert } from 'react-icons/md';

export type SortDirection = 'asc' | 'desc';

export type DataTableColumnFilter =
  | {
      type: 'text';
      placeholder?: string;
    }
  | {
      type: 'select';
      placeholder?: string;
      options: Array<{ label: string; value: string }>;
    };

export type DataTableColumn<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  isNumeric?: boolean;
  sortable?: boolean;
  filter?: DataTableColumnFilter;
};

export type DataTablePagination = {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

export type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  loading?: boolean;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: {
    values: Record<string, string>;
    onChange: (columnId: string, value: string) => void;
  };
  sort?: {
    columnId?: string;
    direction?: SortDirection;
    onChange: (columnId: string, direction: SortDirection) => void;
  };
  pagination?: DataTablePagination;
  emptyText?: string;
  ariaLabel?: string;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T, index: number) => string | number;
};

export default function DataTable<T>({
  columns,
  data,
  loading,
  search,
  filters,
  sort,
  pagination,
  emptyText,
  ariaLabel,
  onRowClick,
  getRowId,
}: DataTableProps<T>) {
  const bg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('rgba(219, 234, 254, 0.8)', 'whiteAlpha.100');
  const shadow = useColorModeValue('0 4px 20px rgba(37, 99, 235, 0.05)', '0 8px 24px rgba(0, 0, 0, 0.45)');
  const theadBg = useColorModeValue('brand.50', 'whiteAlpha.50');
  const rowHoverBg = useColorModeValue('rgba(238, 244, 255, 0.6)', 'whiteAlpha.100');
  const headerTextColor = useColorModeValue('brand.700', 'brand.200');
  const pageTextColor = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const searchBg = useColorModeValue('white', 'navy.900');
  const searchBorderColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const filterBg = useColorModeValue('white', 'navy.900');
  const emptyTextColor = useColorModeValue('secondaryGray.600', 'secondaryGray.400');

  const showFilters = useMemo(() => {
    if (!filters) return false;
    return columns.some((c) => Boolean(c.filter));
  }, [columns, filters]);

  const totalPages = useMemo(() => {
    if (!pagination) return 1;
    return Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
  }, [pagination]);

  const [localSearch, setLocalSearch] = useState(search?.value ?? '');
  useEffect(() => {
    if (search) setLocalSearch(search.value);
  }, [search?.value]);

  const toggleSort = (columnId: string) => {
    if (!sort) return;
    const dir: SortDirection = sort.columnId === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    sort.onChange(columnId, dir);
  };

  return (
    <Box bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="16px" boxShadow={shadow} overflow="hidden">
      {(search || pagination) ? (
        <Flex px={4} py={3} justify="space-between" align="center" gap={3} flexWrap="wrap" borderBottom="1px solid" borderColor={borderColor}>
          {search ? (
            <HStack spacing={2} minW={{ base: 'full', md: '300px' }}>
              <Box as={MdSearch} color="brand.500" fontSize="20px" />
              <Input
                aria-label="Search table"
                value={localSearch}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalSearch(v);
                  search.onChange(v);
                }}
                placeholder={search.placeholder || 'Search records...'}
                size="sm"
                borderRadius="10px"
                bg={searchBg}
                borderColor={searchBorderColor}
              />
            </HStack>
          ) : null}

          {pagination ? (
            <HStack spacing={2}>
              <Text fontSize="sm" color={pageTextColor}>
                Page {pagination.pageIndex + 1} of {totalPages}
              </Text>
              {pagination.onPageSizeChange ? (
                <Select
                  aria-label="Rows per page"
                  size="sm"
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  w="96px"
                  borderRadius="8px"
                >
                  {[10, 20, 50, 100].map((s) => (
                    <option key={s} value={s}>
                      {s}/page
                    </option>
                  ))}
                </Select>
              ) : null}
              <IconButton
                aria-label="Previous page"
                size="sm"
                icon={<MdChevronLeft />}
                variant="outline"
                borderRadius="8px"
                isDisabled={pagination.pageIndex <= 0}
                onClick={() => pagination.onPageChange(Math.max(0, pagination.pageIndex - 1))}
              />
              <IconButton
                aria-label="Next page"
                size="sm"
                icon={<MdChevronRight />}
                variant="outline"
                borderRadius="8px"
                isDisabled={pagination.pageIndex >= totalPages - 1}
                onClick={() => pagination.onPageChange(Math.min(totalPages - 1, pagination.pageIndex + 1))}
              />
            </HStack>
          ) : null}
        </Flex>
      ) : null}

      <Box overflowX="auto">
        <Table aria-label={ariaLabel || 'Data table'} size="md">
          <Thead bg={theadBg}>
            <Tr>
              {columns.map((c) => {
                const isSorted = sort?.columnId === c.id;
                return (
                  <Th key={c.id} isNumeric={c.isNumeric} py={3.5} borderColor={borderColor}>
                    <HStack spacing={1}>
                      <Text fontSize="xs" fontWeight={800} color={headerTextColor} letterSpacing="0.4px">
                        {c.header}
                      </Text>
                      {c.sortable && sort ? (
                        <IconButton
                          aria-label={`Sort by ${c.header}`}
                          size="xs"
                          variant="ghost"
                          icon={<MdSwapVert />}
                          _hover={{ color: 'brand.500' }}
                          onClick={() => toggleSort(c.id)}
                        />
                      ) : null}
                      {isSorted ? (
                        <Text fontSize="xs" color="brand.500" fontWeight="700">
                          {sort?.direction === 'asc' ? '↑' : '↓'}
                        </Text>
                      ) : null}
                    </HStack>
                  </Th>
                );
              })}
            </Tr>
            {showFilters ? (
              <Tr>
                {columns.map((c) => {
                  const f = c.filter;
                  return (
                    <Th key={`${c.id}-filter`} isNumeric={c.isNumeric} py={2} borderColor={borderColor}>
                      {filters && f ? (
                        f.type === 'select' ? (
                          <Select
                            aria-label={`Filter ${c.header}`}
                            size="sm"
                            value={filters.values[c.id] ?? ''}
                            onChange={(e) => filters.onChange(c.id, e.target.value)}
                            bg={filterBg}
                            borderRadius="8px"
                          >
                            <option value="">{f.placeholder || 'All'}</option>
                            {f.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            aria-label={`Filter ${c.header}`}
                            size="sm"
                            value={filters.values[c.id] ?? ''}
                            onChange={(e) => filters.onChange(c.id, e.target.value)}
                            placeholder={f.placeholder || 'Filter...'}
                            bg={filterBg}
                            borderRadius="8px"
                          />
                        )
                      ) : null}
                    </Th>
                  );
                })}
              </Tr>
            ) : null}
          </Thead>
          <Tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Tr key={i}>
                  {columns.map((c) => (
                    <Td key={c.id} isNumeric={c.isNumeric} borderColor={borderColor} py={3}>
                      <Skeleton h="14px" borderRadius="4px" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : data.length === 0 ? (
              <Tr>
                <Td colSpan={columns.length} borderColor={borderColor}>
                  <Box py={10} textAlign="center">
                    <Text fontSize="sm" color={emptyTextColor}>
                      {emptyText || 'No records found.'}
                    </Text>
                  </Box>
                </Td>
              </Tr>
            ) : (
              data.map((row, idx) => (
                <Tr
                  key={String(getRowId ? getRowId(row, idx) : idx)}
                  _hover={{ bg: rowHoverBg }}
                  transition="background-color 0.15s ease"
                  cursor={onRowClick ? 'pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  role={onRowClick ? 'button' : undefined}
                >
                  {columns.map((c) => {
                    const content = c.cell ? c.cell(row) : c.accessor ? c.accessor(row) : (row as any)[c.id];
                    return (
                      <Td key={c.id} isNumeric={c.isNumeric} borderColor={borderColor} py={3.5} fontSize="sm">
                        {content}
                      </Td>
                    );
                  })}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
        <noscript>
          <Text p={4} fontSize="sm">Table features require JavaScript.</Text>
        </noscript>
      </Box>
    </Box>
  );
}
