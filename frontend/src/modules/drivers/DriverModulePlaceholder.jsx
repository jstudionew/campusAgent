import React from 'react';
import ModernPlaceholder from '../../components/common/ModernPlaceholder';

export default function DriverModulePlaceholder({ title, subtitle }) {
  return (
    <ModernPlaceholder
      title={title}
      subtitle={subtitle || `Driver ${title} operations and route tasks.`}
      role="driver"
      badgeText="Driver Transit Hub"
    />
  );
}
