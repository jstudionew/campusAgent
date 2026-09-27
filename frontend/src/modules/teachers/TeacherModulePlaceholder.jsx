import React from 'react';
import ModernPlaceholder from '../../components/common/ModernPlaceholder';

export default function TeacherModulePlaceholder({ title, subtitle }) {
  return (
    <ModernPlaceholder
      title={title}
      subtitle={subtitle || `Faculty ${title} records and evaluation portal.`}
      role="teacher"
      badgeText="Faculty Workspace"
    />
  );
}
