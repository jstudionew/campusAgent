import React, { useState } from 'react';
import { Box, Flex, Heading, Text, Button, Input, InputGroup, InputLeftElement, FormControl, FormLabel, Checkbox, Link, useToast, VStack, HStack, Icon, Image, useColorModeValue, Badge, Divider } from '@chakra-ui/react';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';
import Card from '../../../../components/card/Card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';

export default function SignIn({ redirectTo = '/admin/dashboard' }) {
  const [email, setEmail] = useState('campusagent');
  const [password, setPassword] = useState('0307');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');
  const heroBg = useColorModeValue('linear-gradient(135deg, #6a85f1 0%, #53c0f0 50%, #7f53f0 100%)', 'linear-gradient(135deg, #4b5bc7 0%, #3b9ec9 50%, #6f3bc9 100%)');

  // Use Auth Context for real login
  const { login: authLogin } = useAuth(); // Renamed to avoid confusion with internal function name if any


  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please enter email and password', status: 'error', duration: 3000 });
      return;
    }

    try {
      setLoading(true);
      toast({ title: 'Signing in...', status: 'info', duration: 1000, isClosable: true });

      const res = await authLogin(email, password, true); // true = remember me

      if (res.success) {
        toast({ title: 'Welcome back!', description: `Logged in as ${res.user.role}`, status: 'success', duration: 2000, isClosable: true });
        // Navigation is handled by authLogin
      } else {
        toast({ title: 'Login Failed', description: res.error, status: 'error', duration: 3000, isClosable: true });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'An unexpected error occurred', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box pt={{ base: '80px', md: '40px', xl: '40px' }}>
      <Flex direction={{ base: 'column', xl: 'row' }} gap={6} align='stretch' justify='center' mx='auto' maxW='1200px'>
        {/* Left: Form */}
        <Box flex='1' minW={{ base: '100%', xl: '50%' }} px={{ base: 4, md: 8 }}>
          <Heading size='lg' mb={1}>CampusAgent</Heading>
          <Text color={textColorSecondary} mb={6}>Manage. Connect. Automate. Grow.</Text>


          <Card maxW='560px' w='100%' p={8}>
            <VStack spacing={4} align='stretch'>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents='none'>
                    <Icon as={MdEmail} color='gray.400' />
                  </InputLeftElement>
                  <Input type='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter your email' />
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents='none'>
                    <Icon as={MdLock} color='gray.400' />
                  </InputLeftElement>
                  <Input type='password' value={password} onChange={(e) => setPassword(e.target.value)} placeholder='Enter your password' />
                </InputGroup>
              </FormControl>
              <Flex align='center' justify='space-between'>
                <Checkbox defaultChecked>Keep me logged in</Checkbox>
                <Link color='blue.500'>Forgot password?</Link>
              </Flex>
              <Button colorScheme='blue' leftIcon={<MdLogin />} isLoading={loading} onClick={handleSignIn}>Sign In</Button>
              <Divider />
              <Text color={textColorSecondary} fontSize='xs'>CampusAgent · Developed by J-Studio · www.jstudio.tech</Text>
            </VStack>
          </Card>
        </Box>

        {/* Right: Hero */}
        <Box flex='1' minW={{ base: '100%', xl: '50%' }} borderRadius='16px' overflow='hidden' position='relative'>
          <Box w='100%' h={{ base: '220px', md: '320px', xl: '560px' }} bg={heroBg} display='flex' alignItems='center' justifyContent='center'>
            <VStack spacing={3} color='white'>
              <Image src='/CAlogo.jfif' alt='CampusAgent' w='100px' h='100px' objectFit='contain' bg='white' borderRadius='full' p='2' />
              <Text fontSize='lg' fontWeight='700'>CampusAgent</Text>
              <Text fontSize='sm' opacity={0.9}>Developed by J-Studio · www.jstudio.tech</Text>
            </VStack>
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}
