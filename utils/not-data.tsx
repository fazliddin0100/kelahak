import React from 'react';
import EmptyState from '@/components/EmptyState';

interface NotDataProps {
  title?: string;
  description?: string;
}

/** Bo'sh ro'yxat holati (loyiha uslubida, o'zbekcha). */
const NotData: React.FC<NotDataProps> = ({ title, description }) => (
  <EmptyState title={title} description={description} />
);

export default NotData;
