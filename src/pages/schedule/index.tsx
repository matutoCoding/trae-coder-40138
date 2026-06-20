import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Picker } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import TableCard from '../../components/TableCard';
import TimeSlotBar from '../../components/TimeSlotBar';
import Tag from '../../components/Tag';
import EmptyState from '../../components/EmptyState';
import { formatDate, todayStart } from '../../utils/time';

type FilterType = 'all' | 'free' | 'occupied' | 'reserved';

const SchedulePage: React.FC = () => {
  const { tables, occupancies, createOccupancy, mergeTwoOccupancies, splitOccupancyAt } = useStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(todayStart());
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    return {
      total: tables.length,
      free: tables.filter(t => t.status === 'free').length,
      occupied: tables.filter(t => t.status === 'occupied').length
    };
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    return tables.filter(t => t.status === filter);
  }, [tables, filter]);

  const occupanciesByTable = useMemo(() => {
    const map: Record<string, typeof occupancies> = {};
    tables.forEach(t => {
      map[t.id] = occupancies.filter(o => o.tableId === t.id);
    });
    return map;
  }, [tables, occupancies]);

  const allTodayOccupancies = useMemo(() => {
    const dayStart = selectedDate;
    const dayEnd = selectedDate + 24 * 60 * 60 * 1000;
    return occupancies.filter(o =>
      (o.startAt >= dayStart && o.startAt < dayEnd) ||
      (o.endAt > dayStart && o.endAt <= dayEnd) ||
      (o.startAt < dayStart && o.endAt > dayEnd)
    );
  }, [occupancies, selectedDate]);

  const handleOpenTable = (tableId: string) => {
    Taro.navigateTo({
      url: `/pages/booking-detail/index?tableId=${tableId}&mode=create`
    });
  };

  const handleTableClick = (tableId: string) => {
    const tableOcc = occupanciesByTable[tableId]?.find(o => o.status === 'active');
    if (tableOcc) {
      Taro.navigateTo({
        url: `/pages/bill-detail/index?occupancyId=${tableOcc.id}`
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleMerge = () => {
    Taro.showActionSheet({
      itemList: tables
        .filter(t => t.status === 'occupied')
        .map(t => `${t.name} - ${occupanciesByTable[t.id]?.find(o => o.status === 'active')?.playerName || ''}`),
      success: (res) => {
        console.log('[Schedule] Merge selected index:', res.tapIndex);
        Taro.showToast({ title: '请先选择两段占用再合并', icon: 'none' });
      }
    });
  };

  const handleSplit = () => {
    const activeOccs = occupancies.filter(o => o.status === 'active');
    if (activeOccs.length === 0) {
      Taro.showToast({ title: '没有进行中的占用', icon: 'none' });
      return;
    }
    Taro.showActionSheet({
      itemList: activeOccs.map(o => `${o.tableName} - ${o.playerName}`),
      success: (res) => {
        const occ = activeOccs[res.tapIndex];
        Taro.showModal({
          title: '拆分占用',
          content: `确定在当前时间拆分「${occ.tableName}」的占用吗？前半段自动结账。`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              const ok = splitOccupancyAt(occ.id, Date.now(), occ.playerName, '新顾客');
              if (ok) {
                Taro.showToast({ title: '拆分成功', icon: 'success' });
              }
            }
          }
        });
      }
    });
  };

  const dateRange = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const ts = todayStart() + d * 24 * 60 * 60 * 1000;
    return { ts, label: d === 0 ? '今天' : d === 1 ? '明天' : formatDate(ts, 'MM/DD') };
  });

  return (
    <ScrollView
      scrollY
      className={styles.page}
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className='pageTitle'>桌台排期管理</View>

      <View className={styles.statsBar}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>桌台总数</Text>
        </View>
        <View className={classnames(styles.statCard, styles.freeStat)}>
          <Text className={styles.statValue}>{stats.free}</Text>
          <Text className={styles.statLabel}>空闲</Text>
        </View>
        <View className={classnames(styles.statCard, styles.occupiedStat)}>
          <Text className={styles.statValue}>{stats.occupied}</Text>
          <Text className={styles.statLabel}>使用中</Text>
        </View>
      </View>

      <Picker
        mode='selector'
        range={dateRange.map(d => d.label)}
        onChange={(e) => setSelectedDate(dateRange[e.detail.value].ts)}
      >
        <View className='card' style={{ padding: '20rpx 32rpx', marginBottom: '32rpx' }}>
          <View className={classnames('flexBetween')}>
            <View className='flexRow' style={{ gap: '16rpx' }}>
              <Text style={{ fontSize: '24rpx', color: '#8C7878' }}>📅</Text>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: '#2D1F1F' }}>
                {formatDate(selectedDate, 'YYYY年MM月DD日')}
              </Text>
            </View>
            <Text style={{ fontSize: '24rpx', color: '#FF7A45' }}>切换日期 ›</Text>
          </View>
        </View>
      </Picker>

      <View className={styles.timelineSection}>
        <Text className={styles.timelineTitle}>时间轴排期</Text>
        {tables.length > 0 ? (
          tables.map(table => (
            <TimeSlotBar
              key={table.id}
              tableName={table.name}
              occupancies={occupanciesByTable[table.id] || []}
            />
          ))
        ) : (
          <EmptyState title='暂无桌台数据' description='请在管理设置中添加桌台' />
        )}
      </View>

      <View className={styles.filterBar}>
        <Text className={styles.filterLabel}>桌台列表</Text>
        <View className={styles.filterChips}>
          {(['all', 'free', 'occupied', 'reserved'] as FilterType[]).map(f => (
            <View
              key={f}
              className={classnames(styles.filterChip, filter === f && styles.filterChipActive)}
              onClick={() => setFilter(f)}
            >
              <Text>
                {f === 'all' ? '全部' : f === 'free' ? '空闲' : f === 'occupied' ? '使用中' : '已预约'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {filteredTables.length > 0 ? (
        filteredTables.map(table => (
          <TableCard
            key={table.id}
            table={table}
            occupancies={occupanciesByTable[table.id] || []}
            onOpen={() => handleOpenTable(table.id)}
            onClick={() => handleTableClick(table.id)}
          />
        ))
      ) : (
        <EmptyState
          title='没有符合条件的桌台'
          description='试试切换其他筛选条件'
        />
      )}

      <View style={{ height: '180rpx' }} />
    </ScrollView>
  );
};

export default SchedulePage;
