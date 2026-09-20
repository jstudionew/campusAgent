/*eslint-disable*/
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
  const textColor = useColorModeValue("gray.400", "white");
  return (
    <Flex
      zIndex='3'
      flexDirection={{
        base: "column",
        xl: "row",
      }}
      alignItems={{
        base: "center",
        xl: "center",
      }}
      justifyContent='space-between'
      px={{ base: "30px", md: "50px" }}
      pb='30px'>
      <Flex align='center' gap='10px' wrap='wrap' justify={{ base: 'center', xl: 'flex-start' }}>
        <Image src={COMPANY_LOGO} alt={COMPANY_NAME} h='22px' objectFit='contain' />
        <Text color={textColor} textAlign={{ base: "center", xl: "start" }}>
          &copy; {1900 + new Date().getYear()} {PRODUCT_NAME}. All rights reserved. Developed by{' '}
          <Link mx='3px' color={textColor} href={COMPANY_WEBSITE} target='_blank' fontWeight='700'>
            {COMPANY_NAME}
          </Link>
        </Text>
      </Flex>
    </Flex>
  );
}
