// Chakra imports
import { Box, Flex, Image, Text } from "@chakra-ui/react";
import PropTypes from "prop-types";
import React from "react";
import FixedPlugin from "components/fixedPlugin/FixedPlugin";
import {
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_WEBSITE_LABEL,
  PRODUCT_LOGO,
  PRODUCT_MODULES,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "../../brand";

function AuthIllustration(props) {
  const { children, illustrationBackground } = props;

  return (
    <Flex
      position='relative'
      minH='100vh'
      w='100%'
      bg='gray.50'
      align='center'
      justify='center'
      py={{ base: "10", md: "16" }}>
      <Box
        w='100%'
        maxW='1100px'
        mx='4'
        bg='white'
        borderRadius='2xl'
        boxShadow='xl'
        overflow='hidden'>
        <Flex direction={{ base: "column", md: "row" }} w='100%' h='100%'>
          <Box
            w={{ base: "100%", md: "50%" }}
            display={{ base: "none", md: "flex" }}
            alignItems='center'
            justifyContent='center'
            bgGradient='linear(to-b, #eef2ff, #e0f2fe)'
            borderRightWidth={{ base: "0", md: "1px" }}
            borderColor='gray.100'>
            <Box
              maxW='400px'
              textAlign='left'
              color='navy.700'
              px='10'>
              <Image src={PRODUCT_LOGO} alt={PRODUCT_NAME} h='64px' mb='4' objectFit='contain' />
              <Text fontSize='lg' fontWeight='700' mb='1'>
                {PRODUCT_NAME}
              </Text>
              <Text fontSize='sm' color='gray.600' fontWeight='600' mb='3'>
                {PRODUCT_TAGLINE}
              </Text>
              <Text fontSize='sm' color='gray.500' mb='5'>
                School and college management for multiple campuses, with each institute keeping its own records.
              </Text>
              <Box mb='5'>
                {PRODUCT_MODULES.map((item) => (
                  <Text key={item} fontSize='xs' color='gray.600' mb='1'>• {item}</Text>
                ))}
              </Box>
              <Box
                bgImage={illustrationBackground}
                bgSize='contain'
                bgRepeat='no-repeat'
                bgPosition='center'
                w='100%'
                h='160px'
                mb='4'
              />
              <Flex align='center' gap='8px'>
                <Image src={COMPANY_LOGO} alt={COMPANY_NAME} h='20px' objectFit='contain' />
                <Text fontSize='xs' color='gray.500'>
                  Developed by {COMPANY_NAME} · {COMPANY_WEBSITE_LABEL}
                </Text>
              </Flex>
            </Box>
          </Box>
          <Box
            w={{ base: "100%", md: "50%" }}
            px={{ base: "6", md: "10" }}
            py={{ base: "8", md: "10" }}
            display='flex'
            alignItems='center'
            justifyContent='center'>
            <Box w='100%' maxW='420px'>
              {children}
            </Box>
          </Box>
        </Flex>
      </Box>
      <FixedPlugin />
    </Flex>
  );
}

AuthIllustration.propTypes = {
  illustrationBackground: PropTypes.string,
  image: PropTypes.any,
};

export default AuthIllustration;
