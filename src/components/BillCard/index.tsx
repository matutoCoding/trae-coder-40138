import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { Bill } from '../../types';
import Tag from '../Tag';
import { formatDate, formatDuration } from '../../utils/time';

export interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
}

const statusMap = {
  unpaid: { text: '待结账', type: 'warning' as const, color: '#F1C40F' },
  paid: { text: '已结账', type: 'success' as const, color: '#2ECC71' },
  refunded: { text: '已退款', type: 'error' as const, color: '#E74C3C' }
};

const BillCard: React.FC<BillCardProps> = ({ bill, onClick }) => {
  const statusInfo = statusMap[bill.status];

  return (
    <View className={styles.billCard} onClick={onClick}>
      <View className={styles.cardHeader}>
        <View className={styles.orderNoRow}>
          <Text className={styles.orderNo}>{bill.orderNo}</Text>
          <Tag text={statusInfo.text} type={statusInfo.type} size="sm" />
        </View>
        <Text className={styles.createTime}>{formatDate(bill.createdAt)}</Text>
      </View>

      <View className={styles.cardBody}>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>桌台</Text>
          <Text className={styles.infoValue}>{bill.tableName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>玩家</Text>
          <Text className={styles.infoValue}>{bill.playerName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>时长</Text>
          <Text className={styles.infoValue}>{formatDuration(bill.totalHours)}</Text>
        </View>
        {bill.gameRentals.length > 0 && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>桌游</Text>
            <Text className={styles.infoValue}>{bill.gameRentals.length}款借用</Text>
          </View>
        )}
      </View>

      <View className={styles.cardFooter}>
        <View className={styles.breakdownPreview}>
          {bill.pricingBreakdown.slice(0, 2).map(b => (
            <View key={b.tierId} className={styles.breakdownTag}>
              <Text className={styles.breakdownTagText}>{b.tierName}</Text>
            </View>
          ))}
          {bill.pricingBreakdown.length > 2 && (
            <View className={styles.breakdownTagMore}>
              <Text className={styles.breakdownTagText}>+{bill.pricingBreakdown.length - 2}</Text>
            </View>
          )}
        </View>
        <View className={styles.totalBox}>
          {bill.discount > 0 && (
            <Text className={styles.discountLabel}>-¥{bill.discount}</Text>
          )}
          <Text className={styles.totalAmount}>¥{bill.totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

export default BillCard;
