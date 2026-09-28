const isAllowed = (value, allowed) => (
  allowed === 'ALL' || (allowed instanceof Set && allowed.has(value))
);

const getAllowedSet = (value) => {
  if (value === 'ALL') return 'ALL';
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((item) => typeof item === 'string'));
};

const MODULE_NAME_ALIASES = {
  'My Classes': 'Academics',
  'Class Schedule': 'Academics',
  'Assignments & Homework': 'Academics',
  'Exams & Results': 'Academics',
  'Study Material': 'Academics',
  'Fee Management': 'Finance',
  Announcements: 'Communication',
};

const PATH_MODULES = {
  academics: 'Academics',
  classes: 'Academics',
  assignments: 'Academics',
  exams: 'Academics',
  schedule: 'Academics',
  materials: 'Academics',
  students: 'Students',
  teachers: 'Teachers',
  attendance: 'Attendance',
  finance: 'Finance',
  fees: 'Finance',
  transport: 'Transport',
  routes: 'Transport',
  'live-tracking': 'Transport',
  'pickup-drop': 'Transport',
  checklist: 'Transport',
  incidents: 'Transport',
  shift: 'Transport',
  documents: 'Transport',
  salary: 'Finance',
  announcements: 'Communication',
  communications: 'Communication',
};

const getModuleName = (route, inheritedModule) => {
  const label = inheritedModule || route.name;
  if (MODULE_NAME_ALIASES[label]) return MODULE_NAME_ALIASES[label];
  if (route.path) {
    const pathModule = PATH_MODULES[route.path.split('/').filter(Boolean)[0]];
    if (pathModule) return pathModule;
  }
  return label;
};

export const filterRoutesByAccess = (routes, { layout, moduleAccess, role } = {}) => {
  if (!Array.isArray(routes) || !layout || !role) return [];

  const allowedModules = getAllowedSet(moduleAccess?.allowModules);
  const allowedSubroutes = getAllowedSet(moduleAccess?.allowSubroutes);

  const filterTree = (items, inheritedModule = null) => items
    .map((route) => {
      if (!route || route.enabled === false || (route.ownerOnly && role !== 'owner')) return null;

      if (route.category && Array.isArray(route.items)) {
        const children = filterTree(route.items, inheritedModule);
        return children.length ? { ...route, items: children } : null;
      }
      if (route.layout !== layout) return null;

      if (role === 'parent' && layout === '/admin' &&
        route.name !== 'Parent Portal' && inheritedModule !== 'Parent Portal' &&
        route.path !== '/account-profile') {
        return null;
      }

      const moduleName = getModuleName(route, route.collapse ? route.name : inheritedModule);
      const moduleAllowed = role === 'owner' ||
        (layout === '/admin' && role === 'superadmin') ||
        isAllowed(moduleName, allowedModules);

      if (route.collapse && Array.isArray(route.items)) {
        const children = filterTree(route.items, route.name);
        return children.length ? { ...route, items: children } : null;
      }

      if (Array.isArray(route.items)) {
        const children = filterTree(route.items, moduleName);
        return children.length ? { ...route, items: children } : null;
      }

      if (route.alwaysAllow) return route;
      if (!moduleAllowed) return null;
      if (!route.path) return route;

      const subrouteAllowed = role === 'owner' ||
        (layout === '/admin' && role === 'superadmin') ||
        isAllowed(route.path, allowedSubroutes);
      return subrouteAllowed ? route : null;
    })
    .filter(Boolean);

  return filterTree(routes);
};

export default filterRoutesByAccess;
