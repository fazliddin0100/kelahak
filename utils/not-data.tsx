import React from 'react';
import { Empty } from 'antd';

interface NotDataProps {
  description?: React.ReactNode;
}

const NotData: React.FC<NotDataProps> = ({ description }) => <Empty description={description} />;

export default NotData;
