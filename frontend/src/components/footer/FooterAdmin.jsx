import React from "react";
import {
  Flex,
  Image,
  Link,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { COMPANY_LOGO, COMPANY_NAME, COMPANY_WEBSITE, PRODUCT_NAME } from "../../brand";

export default function Footer() {
  const textColor = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const linkHover = useColorModeValue("brand.600", "brand.300");

  return (
    <Flex
      zIndex='3'
      flexDirection={{
        base: "column",
        xl: "row",
      }}
      alignItems='center'
      justifyContent='space-between'
      px={{ base: "20px", md: "30px" }}
      py='20px'
      mt='auto'
    >
      <Flex align='center' gap='10px' wrap='wrap' justify={{ base: 'center', xl: 'flex-start' }}>
        <Image src={COMPANY_LOGO} alt={COMPANY_NAME} h='22px' objectFit='contain' />
        <Text color={textColor} fontSize="sm" textAlign={{ base: "center", xl: "start" }}>
          &copy; {new Date().getFullYear()} {PRODUCT_NAME}. All rights reserved. Developed by{' '}
          <Link
            mx='3px'
            color={textColor}
            _hover={{ color: linkHover, textDecoration: 'underline' }}
            href={COMPANY_WEBSITE}
            target='_blank'
            fontWeight='700'
          >
            {COMPANY_NAME}
          </Link>
        </Text>
      </Flex>
    </Flex>
  );
}
