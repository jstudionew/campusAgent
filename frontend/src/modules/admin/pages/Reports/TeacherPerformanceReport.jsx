import React from 'react';
import { Alert, AlertIcon, Box, Heading, Text } from '@chakra-ui/react';

export default function TeacherPerformanceReport() {
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Heading as="h3" size="lg" mb={1}>Teacher Performance</Heading>
      <Text color="gray.500" mb={5}>Teacher performance report</Text>
      <Alert status="info">
        <AlertIcon />
        Teacher performance reporting is unavailable because no compatible reporting API exists.
      </Alert>
    </Box>
  );
}
