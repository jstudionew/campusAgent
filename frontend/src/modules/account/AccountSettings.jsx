import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../services/api';

const PROFILE_INPUTS = [
  ['name', 'Display name', 'text'],
  ['username', 'Username', 'text'],
  ['email', 'Email address', 'email'],
  ['phone', 'Phone number', 'tel'],
  ['jobTitle', 'Job title', 'text'],
  ['department', 'Department', 'text'],
];

const toDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Unable to read the selected image'));
  reader.readAsDataURL(blob);
});

const optimizeImage = async (file) => {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose an image smaller than 8 MB');

  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  if (!blob) throw new Error('Unable to process the selected image');
  return toDataUrl(blob);
};

export default function AccountSettings({ focusSecurity = false }) {
  const { user, updateUser, updateSession } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const fileInput = useRef(null);
  const [form, setForm] = useState(null);
  const [editableFields, setEditableFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    let active = true;
    authApi.profile()
      .then((response) => {
        if (!active) return;
        const profile = response?.user;
        if (!profile) throw new Error('The server returned an invalid profile');
        setForm({
          name: profile.name || '',
          username: profile.username || '',
          email: profile.email || '',
          phone: profile.phone || '',
          jobTitle: profile.jobTitle || '',
          department: profile.department || '',
          avatar: profile.avatar || null,
          role: profile.role,
          campusId: profile.campusId,
        });
        setEditableFields(response.editableFields || []);
        updateUser(profile);
      })
      .catch((error) => {
        if (!active) return;
        toast({
          status: 'error',
          title: 'Could not load account settings',
          description: error?.message || 'Please try again.',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [toast, updateUser]);

  useEffect(() => {
    if (focusSecurity || searchParams.get('section') === 'security') {
      document.getElementById('account-security')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusSecurity, searchParams, loading]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const onImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setField('avatar', await optimizeImage(file));
    } catch (error) {
      toast({ status: 'error', title: 'Could not use this photo', description: error.message });
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const payload = Object.fromEntries(
        editableFields.filter((field) => Object.hasOwn(form, field)).map((field) => [field, form[field]])
      );
      const response = await authApi.updateMyProfile(payload);
      if (!response?.user) throw new Error('The server returned an invalid profile update');
      setForm((current) => ({ ...current, ...response.user }));
      setEditableFields(response.editableFields || editableFields);
      updateSession(response);
      toast({ status: 'success', title: 'Profile updated' });
    } catch (error) {
      toast({
        status: 'error',
        title: 'Could not save profile',
        description: error?.data?.message || error?.message || 'Please try again.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (password.next !== password.confirm) {
      toast({ status: 'error', title: 'Passwords do not match' });
      return;
    }
    setSavingPassword(true);
    try {
      const response = await authApi.updateMyProfile({
        currentPassword: password.current,
        newPassword: password.next,
      });
      if (!response?.user) throw new Error('The server returned an invalid profile update');
      updateSession(response);
      setPassword({ current: '', next: '', confirm: '' });
      toast({ status: 'success', title: 'Password updated' });
    } catch (error) {
      toast({
        status: 'error',
        title: 'Could not update password',
        description: error?.data?.message || error?.message || 'Please try again.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Flex minH="40vh" align="center" justify="center"><Spinner /></Flex>;
  }
  if (!form) {
    return (
      <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
        <Text color="red.500">Account settings could not be loaded. Refresh the page to try again.</Text>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }} pb={8}>
      <Heading size="lg" mb={2}>Account settings</Heading>
      <Text color={subtleColor} mb={6}>Manage your sign-in details and personal account profile.</Text>

      <Card as="form" onSubmit={saveProfile} p={{ base: 4, md: 6 }} mb={6}>
        <VStack align="stretch" spacing={5}>
          <Heading size="md">Profile</Heading>
          <Flex align="center" gap={4} wrap="wrap">
            <Avatar size="xl" name={form.name} src={typeof form.avatar === 'string' ? form.avatar : undefined} />
            <VStack align="start" spacing={2}>
              <Text fontWeight="semibold">Profile photo</Text>
              <Flex gap={2} wrap="wrap">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={onImageSelected}
                  aria-label="Choose profile photo"
                />
                <Button type="button" size="sm" isDisabled={savingProfile} onClick={() => fileInput.current?.click()}>Choose photo</Button>
                {form.avatar && editableFields.includes('avatar') && (
                  <Button type="button" size="sm" variant="outline" isDisabled={savingProfile} onClick={() => setField('avatar', null)}>Remove photo</Button>
                )}
              </Flex>
              <Text fontSize="sm" color={subtleColor}>PNG, JPEG, or WebP. Images are resized before upload.</Text>
            </VStack>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {PROFILE_INPUTS.filter(([field]) => editableFields.includes(field)).map(([field, label, type]) => (
              <FormControl key={field} isRequired={field === 'name' || field === 'username'}>
                <FormLabel htmlFor={`account-${field}`}>{label}</FormLabel>
                <Input
                  id={`account-${field}`}
                  type={type}
                  value={form[field] || ''}
                  onChange={(event) => setField(field, event.target.value)}
                  isDisabled={savingProfile}
                  autoComplete={field === 'username' ? 'username' : field === 'email' ? 'email' : 'off'}
                  minLength={field === 'username' ? 3 : undefined}
                  maxLength={field === 'username' ? 40 : field === 'name' ? 120 : undefined}
                />
              </FormControl>
            ))}
          </SimpleGrid>

          <Divider />
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Role</FormLabel>
              <Input value={form.role || user?.role || ''} isReadOnly />
            </FormControl>
            <FormControl>
              <FormLabel>Campus ID</FormLabel>
              <Input value={form.campusId || 'Not assigned'} isReadOnly />
            </FormControl>
          </SimpleGrid>
          <Flex justify="flex-end">
            <Button type="submit" colorScheme="blue" isLoading={savingProfile} isDisabled={!editableFields.length}>
              Save profile
            </Button>
          </Flex>
        </VStack>
      </Card>

      <Card as="form" id="account-security" onSubmit={savePassword} p={{ base: 4, md: 6 }}>
        <VStack align="stretch" spacing={4}>
          <Box>
            <Heading size="md">Security</Heading>
            <Text color={subtleColor} mt={1}>Use your current password to set a new one (at least 8 characters).</Text>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel htmlFor="account-current-password">Current password</FormLabel>
              <Input id="account-current-password" type="password" autoComplete="current-password" value={password.current} onChange={(event) => setPassword((current) => ({ ...current, current: event.target.value }))} />
            </FormControl>
            <Box />
            <FormControl isRequired>
              <FormLabel htmlFor="account-new-password">New password</FormLabel>
              <Input id="account-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password.next} onChange={(event) => setPassword((current) => ({ ...current, next: event.target.value }))} />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor="account-confirm-password">Confirm new password</FormLabel>
              <Input id="account-confirm-password" type="password" autoComplete="new-password" value={password.confirm} onChange={(event) => setPassword((current) => ({ ...current, confirm: event.target.value }))} isInvalid={Boolean(password.confirm && password.next !== password.confirm)} />
            </FormControl>
          </SimpleGrid>
          <Flex justify="flex-end">
            <Button type="submit" colorScheme="blue" isLoading={savingPassword} isDisabled={!password.current || password.next.length < 8 || password.next !== password.confirm}>
              Update password
            </Button>
          </Flex>
        </VStack>
      </Card>
    </Box>
  );
}
