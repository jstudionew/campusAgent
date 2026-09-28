import React from 'react';
import { Td, Tr } from '@chakra-ui/react';

export default function ReportTableState({ data, loading, error, colSpan, emptyMessage, initialMessage }) {
  if (loading) {
    return <Tr><Td colSpan={colSpan} textAlign="center">Loading report…</Td></Tr>;
  }

  if (error) {
    return <Tr><Td colSpan={colSpan} textAlign="center">Report data is unavailable.</Td></Tr>;
  }

  if (data === null) {
    return <Tr><Td colSpan={colSpan} textAlign="center">{initialMessage || 'Choose report filters to load data.'}</Td></Tr>;
  }

  if (data.length === 0) {
    return <Tr><Td colSpan={colSpan} textAlign="center">{emptyMessage}</Td></Tr>;
  }

  return null;
}
