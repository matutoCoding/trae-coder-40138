import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { PricingTier } from '../../types';
import Tag from '../Tag';
import { getTierLabel } from '../../utils/pricing';

export interface PricingTierCardProps {
  tier: PricingTier;
  highlight?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actionMode?: 'view' | 'manage';
}

const PricingTierCard: React.FC<PricingTierCardProps> = ({
  tier,
  highlight = false,
  onToggle,
  onEdit,
  onDelete,
  actionMode = 'view'
}) => {
  return (
    <View className={classnames(styles.tierCard, highlight && styles.tierHighlight, !tier.enabled && styles.tierDisabled)}>
      <View className={styles.tierHeader}>
        <View className={styles.tierIndex}>
          <Text className={styles.tierIndexText}>{tier.tierIndex}</Text>
        </View>
        <View className={styles.tierMeta}>
          <Text className={styles.tierName}>{tier.name}</Text>
          <Tag text={getTierLabel(tier)} type="info" size="sm" />
        </View>
        {!tier.enabled && <Tag text="已停用" type="error" size="sm" />}
      </View>

      <View className={styles.tierBody}>
        <View className={styles.rateRow}>
          <Text className={styles.rateLabel}>单价</Text>
          <Text className={styles.rateValue}>¥{tier.rate}/小时</Text>
        </View>
        <Text className={styles.tierDesc}>{tier.description}</Text>
      </View>

      {actionMode === 'manage' && (
        <View className={styles.actionRow}>
          <Button className={classnames(styles.actionBtn, styles.toggleBtn)} onClick={onToggle}>
            <Text className={styles.toggleBtnText}>{tier.enabled ? '停用' : '启用'}</Text>
          </Button>
          <Button className={classnames(styles.actionBtn, styles.editBtn)} onClick={onEdit}>
            <Text className={styles.editBtnText}>编辑</Text>
          </Button>
          <Button className={classnames(styles.actionBtn, styles.deleteBtn)} onClick={onDelete}>
            <Text className={styles.deleteBtnText}>删除</Text>
          </Button>
        </View>
      )}
    </View>
  );
};

export default PricingTierCard;
