import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

export interface TagProps {
  text: string;
  type?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'occupied' | 'free' | 'reserved';
  size?: 'sm' | 'md';
  outline?: boolean;
}

const Tag: React.FC<TagProps> = ({ text, type = 'primary', size = 'sm', outline = false }) => {
  return (
    <View className={classnames(
      styles.tag,
      styles[`tag${type.charAt(0).toUpperCase() + type.slice(1)}`],
      styles[size === 'md' ? 'tagMd' : 'tagSm'],
      outline && styles.tagOutline
    )}>
      <Text className={styles.tagText}>{text}</Text>
    </View>
  );
};

export default Tag;
