const normalizeLabel = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getClassLabel = (row) => {
  const className = row?.className ?? row?.class_name ?? row?.class ?? row?.name;
  const section = row?.section ?? row?.sectionName ?? row?.section_name;
  return className && section ? `${className}${section}` : '';
};

const parseClassLabel = (label) => {
  const dashed = label.match(/^(.+?)\s*-\s*([A-Za-z0-9]+)$/);
  if (dashed) return { className: dashed[1].trim(), section: dashed[2].trim() };

  const compact = label.match(/^(.+\d)\s*([A-Za-z]+)$/);
  if (compact) return { className: compact[1].trim(), section: compact[2].trim() };

  const namedLevel = label.match(/^(.+?)([A-Za-z])$/);
  if (namedLevel && /\d/.test(namedLevel[1])) {
    return { className: namedLevel[1].trim(), section: namedLevel[2].trim() };
  }

  const spaced = label.match(/^(.+\d)\s+([A-Za-z0-9]+)$/);
  if (spaced) return { className: spaced[1].trim(), section: spaced[2].trim() };

  return null;
};

export const syncTeacherClassSections = async ({ labels, campusId, classesApi }) => {
  const uniqueLabels = Array.from(new Set(
    (Array.isArray(labels) ? labels : [])
      .map((label) => String(label || '').trim())
      .filter(Boolean)
  ));
  if (!uniqueLabels.length) return [];

  const options = Number(campusId) > 0
    ? { headers: { 'x-campus-id': String(campusId) } }
    : undefined;
  const response = await classesApi.list({ page: 1, pageSize: 200, campusId }, options);
  const rows = Array.isArray(response?.rows) ? response.rows : Array.isArray(response) ? response : [];
  const knownLabels = new Set(rows.map(getClassLabel).map(normalizeLabel).filter(Boolean));
  const created = [];

  for (const label of uniqueLabels) {
    const normalized = normalizeLabel(label);
    if (knownLabels.has(normalized)) continue;

    const parsed = parseClassLabel(label);
    if (!parsed) {
      throw new Error(`Class "${label}" must include a section, such as 10A or Class 10-A.`);
    }

    const payload = {
      ...parsed,
      academicYear: '',
      ...(Number(campusId) > 0 ? { campusId: Number(campusId) } : {}),
    };
    const row = await classesApi.create(payload, options);
    created.push(row);
    knownLabels.add(normalized);
  }

  return created;
};