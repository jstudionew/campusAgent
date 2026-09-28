import React from 'react';
import { Alert, AlertIcon, Box, Heading, Text } from '@chakra-ui/react';

export default function CustomReports() {
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Heading as="h3" size="lg" mb={1}>Custom Reports</Heading>
      <Text color="gray.500" mb={5}>Custom report builder</Text>
      <Alert status="info">
        <AlertIcon />
        Custom reports are unavailable because there is no report builder or saved-report API.
      </Alert>
    </Box>
  );
}
