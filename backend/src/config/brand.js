export const PRODUCT_NAME = 'CampusAgent';
export const COMPANY_NAME = 'J-Studio';
export const COMPANY_WEBSITE = 'https://www.jstudio.tech';

export const OWNER_USERNAME = 'jstudio';
export const DEFAULT_OWNER_EMAIL = 'officialid40@gmail.com';
export const DEFAULT_OWNER_NAME = 'Jstudio';
export const DEFAULT_OWNER_PASSWORD = '123654';

export const resolveOwnerConfig = () => {
  const ownerEmail = String(process.env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim() || DEFAULT_OWNER_EMAIL;
  const ownerUsername = String(process.env.OWNER_USERNAME || OWNER_USERNAME).trim() || OWNER_USERNAME;
  const ownerName = String(process.env.OWNER_NAME || DEFAULT_OWNER_NAME).trim() || DEFAULT_OWNER_NAME;
  const ownerPassword = process.env.OWNER_PASSWORD || DEFAULT_OWNER_PASSWORD;

  return {
    email: ownerEmail,
    username: ownerUsername,
    name: ownerName,
    password: ownerPassword,
  };
};

export const DEFAULT_ALLOWED_MODULES = [
  'Dashboard',
  'Campuses',
  'Parents',
  'Students',
  'Teachers',
  'Academics',
  'Attendance',
  'Transport',
  'Inventory',
  'Reception',
  'Card Management',
  'Finance',
  'Reports',
  'Events',
  'Certificates',
  'Human Resource',
  'Settings',
  'Library',
  'Admissions',
];
