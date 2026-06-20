import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';
import { TableType, Occupancy } from '../../types';
import Tag from '../Tag';
import { formatTime, getHoursDiff, formatDuration, todayStart, addHours } from '../../utils/time';

export interface TableCardProps {
  table: TableType;
  occupancies?: Occupancy[];
  onClick?: () => void;
  onOpen?: () => void;
}

const statusMap = {
  free: { text: '空闲', type: 'free' as const },
  occupied: { text: '使用中', type: 'occupied' as const },
  reserved: { text: '已预约', type: 'reserved' as const }
};

const TableCard: React.FC<TableCardProps> = ({ table, occupancies = [], onClick, onOpen }) => {
  const statusInfo = statusMap[table.status];
  const activeOcc = occupancies.find(o => o.status === 'active');
  const now = Date.now();

  let currentDuration = '';
  let remainText = '';
  if (activeOcc) {
    const used = getHoursDiff(activeOcc.startAt, now);
    currentDuration = formatDuration(used);
    if (activeOcc.endAt > now) {
      const remain = getHoursDiff(now, activeOcc.endAt);
      remainText = `剩余约${remain.toFixed(1)}h`;
    }
  }

  return (
    <View
      className={classnames(styles.tableCard, table.status === 'free' && styles.freeCard)}
      onClick={onClick}
    >
      <View className={styles.cardHeader}>
        <View className={styles.tableNoBox}>
          <Text className={styles.tableNo}>{table.tableNo}</Text>
        </View>
        <Tag text={statusInfo.text} type={statusInfo.type} size="sm" />
      </View>

      <Text className={styles.tableName}>{table.name}</Text>

      <View className={styles.metaRow}>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>类型</Text>
          <Text className={styles.metaValue}>{table.type}</Text>
        </View>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>容纳</Text>
          <Text className={styles.metaValue}>{table.capacity}人</Text>
        </View>
      </View>

      {activeOcc ? (
        <View className={styles.occupiedInfo}>
          <View className={styles.playerRow}>
            <Text className={styles.playerName}>{activeOcc.playerName}</Text>
            <Text className={styles.phone}>{activeOcc.playerPhone}</Text>
          </View>
          <View className={styles.timeRow}>
            <Text className={styles.timeText}>
              {formatTime(activeOcc.startAt)} - {activeOcc.endAt > now ? '进行中' : formatTime(activeOcc.endAt)}
            </Text>
          </View>
          <View className={styles.durationRow}>
            <Tag text={`已用 ${currentDuration}`} type="warning" size="sm" />
            {remainText && <Tag text={remainText} type="info" size="sm" />}
          </View>
        </View>
      ) : (
        <View className={styles.baseRateRow}>
          <Text className={styles.baseRateLabel}>基础时薪</Text>
          <Text className={styles.baseRateValue}>¥{table.baseRate}/h</Text>
        </View>
      )}

      <View className={styles.actionRow}>
        {table.status === 'free' ? (
          <View className={classnames(styles.actionBtn, styles.openBtn)} onClick={(e) => { e.stopPropagation(); onOpen?.(); }}>
            <Text className={styles.actionBtnText}>一键开台</Text>
          </View>
        ) : (
          <View className={classnames(styles.actionBtn, styles.detailBtn)}>
            <Text className={styles.actionBtnText}>查看详情</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default TableCard;
