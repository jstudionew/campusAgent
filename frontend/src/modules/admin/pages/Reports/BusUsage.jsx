import React from 'react';
import { Alert, AlertIcon, Box, Heading, Text } from '@chakra-ui/react';

export default function BusUsage() {
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Heading as="h3" size="lg" mb={1}>Bus Usage</Heading>
      <Text color="gray.500" mb={5}>Transport usage report</Text>
      <Alert status="info">
        <AlertIcon />
        Bus trip, distance, and occupancy reporting is unavailable because no compatible transport reporting API exists.
      </Alert>
    </Box>
  );
}
