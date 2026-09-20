import React, { useState, useEffect } from 'react';
import {
  Box, Heading, Text, VStack, HStack, Switch, FormControl, FormLabel,
  Card, CardBody, useToast, Spinner, Center, Badge, Divider,
  useColorModeValue, SimpleGrid, Icon
} from '@chakra-ui/react';
import { MdVisibility, MdVisibilityOff, MdSecurity } from 'react-icons/md';
import { authApi } from '../../../../services/api';

const DEFAULT_MODULES = [
  { key: 'finance', label: 'Finance Module', description: 'Fee management, invoices, payments, and financial reports' },
  { key: 'hr', label: 'Human Resources', description: 'Employee management, payroll, and leave tracking' },
  { key: 'licensing', label: 'Licensing & Configuration', description: 'System licensing keys and module activation' },
  { key: 'campuses', label: 'Campus Management', description: 'Create, edit, and manage school campuses' },
  { key: 'user_management', label: 'User Management', description: 'Create, edit, and delete user accounts' },
  { key: 'system_settings', label: 'System Settings', description: 'Core system configuration and preferences' },
  { key: 'audit_logs', label: 'Audit Logs', description: 'System activity and change logs' },
  { key: 'reports_financial', label: 'Financial Reports', description: 'Revenue, expense, and profit reports' },
];

export default function OwnerVisibilitySettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authApi.getVisibilitySettings();
      const map = {};
      (res.data?.settings || res.settings || []).forEach(s => {
        map[s.settingKey] = s.settingValue;
      });
      setSettings(map);
    } catch (err) {
      console.error('Failed to fetch visibility settings', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = async (key, label) => {
    const currentVal = settings[key] || {};
    const newHidden = !(currentVal.hidden === true);
    setSaving(key);
    try {
      await authApi.updateVisibilitySetting({
        settingKey: key,
        settingValue: { hidden: newHidden },
        description: label
      });
      setSettings(prev => ({
        ...prev,
        [key]: { ...prev[key], hidden: newHidden }
      }));
      toast({
        title: newHidden ? 'Hidden from Superadmin' : 'Visible to Superadmin',
        description: `${label} is now ${newHidden ? 'hidden from' : 'visible to'} superadmin users.`,
        status: newHidden ? 'warning' : 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update visibility setting',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <Center pt="130px"><Spinner size="xl" /></Center>;

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={1}>Owner Visibility Controls</Heading>
          <Text color="gray.500">Control which modules and data the Superadmin role can access. Only the Owner can change these settings.</Text>
        </Box>

        <Card bg={cardBg} borderRadius="20px" p={2}>
          <CardBody>
            <VStack spacing={0} divider={<Divider />}>
              {DEFAULT_MODULES.map((mod) => {
                const isHidden = settings[mod.key]?.hidden === true;
                return (
                  <HStack key={mod.key} w="100%" justify="space-between" py={4} px={2}>
                    <HStack spacing={4} flex={1}>
                      <Icon as={isHidden ? MdVisibilityOff : MdVisibility} boxSize={5} color={isHidden ? 'red.400' : 'green.400'} />
                      <Box>
                        <HStack spacing={2}>
                          <Text fontWeight="600">{mod.label}</Text>
                          <Badge colorScheme={isHidden ? 'red' : 'green'} fontSize="xs">
                            {isHidden ? 'Hidden' : 'Visible'}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.500">{mod.description}</Text>
                      </Box>
                    </HStack>
                    <FormControl display="flex" alignItems="center" w="auto">
                      <FormLabel htmlFor={mod.key} mb="0" mr={3} fontSize="sm" color="gray.500">
                        {isHidden ? 'Show' : 'Hide'}
                      </FormLabel>
                      <Switch
                        id={mod.key}
                        isChecked={!isHidden}
                        onChange={() => toggleModule(mod.key, mod.label)}
                        isDisabled={saving === mod.key}
                        colorScheme="green"
                      />
                    </FormControl>
                  </HStack>
                );
              })}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
