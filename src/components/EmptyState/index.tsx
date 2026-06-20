import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

export interface EmptyStateProps {
  title?: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '还没有相关记录'
}) => {
  return (
    <View className={styles.emptyContainer}>
      <View className={styles.emptyIcon}>
        <Text className={styles.emptyIconText}>📋</Text>
      </View>
      <Text className={styles.emptyTitle}>{title}</Text>
      <Text className={styles.emptyDesc}>{description}</Text>
    </View>
  );
};

export default EmptyState;
