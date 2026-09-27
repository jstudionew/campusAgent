import React from 'react';
import ModernPlaceholder from '../../components/common/ModernPlaceholder';

export default function StudentModulePlaceholder({ title, subtitle }) {
  return (
    <ModernPlaceholder
      title={title}
      subtitle={subtitle || `Student ${title} overview and digital materials.`}
      role="student"
      badgeText="Student Portal"
    />
  );
}
