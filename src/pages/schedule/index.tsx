import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Picker } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import TableCard from '../../components/TableCard';
import TimeSlotBar from '../../components/TimeSlotBar';
import EmptyState from '../../components/EmptyState';
import { formatDate, todayStart } from '../../utils/time';
import { Occupancy } from '../../types';
import { canMergeOccupancies } from '../../utils/occupancy';

type FilterType = 'all' | 'free' | 'occupied' | 'reserved';
type OpMode = 'browse' | 'merge' | 'split';

const SchedulePage: React.FC = () => {
  const {
    tables, occupancies,
    createOccupancy, mergeTwoOccupancies, splitOccupancyAt, findAdjacentMergeable
  } = useStore();

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState(todayStart());
  const [refreshing, setRefreshing] = useState(false);
  const [opMode, setOpMode] = useState<OpMode>('browse');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const stats = useMemo(() => ({
    total: tables.length,
    free: tables.filter(t => t.status === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length
  }), [tables]);

  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    return tables.filter(t => t.status === filter);
  }, [tables, filter]);

  const occupanciesByTable = useMemo(() => {
    const map: Record<string, Occupancy[]> = {};
    tables.forEach(t => {
      map[t.id] = occupancies.filter(o => o.tableId === t.id);
    });
    return map;
  }, [tables, occupancies]);

  const selectedOccupancies = useMemo(
    () => occupancies.filter(o => selectedIds.includes(o.id)),
    [occupancies, selectedIds]
  );

  const mergeHint = useMemo(() => {
    if (opMode !== 'merge') return '';
    if (selectedIds.length === 0) return '请点击上方时间轴中的占用条选择2个相邻时段';
    if (selectedIds.length === 1) {
      const occ = selectedOccupancies[0];
      const adj = findAdjacentMergeable(occ);
      return `已选1个：${occ?.tableName}-${occ?.playerName}。${adj ? `请继续选中相邻的「${adj.tableName}-${adj.playerName}」` : '未找到相邻可合并的占用，请确认同玩家同桌台并时段相邻'}`;
    }
    if (selectedIds.length >= 2) {
      const [a, b] = [selectedOccupancies[0], selectedOccupancies[1]];
      return canMergeOccupancies(a, b) ? '✅ 两项符合条件，点击下方执行合并' : '❌ 两项不可合并（需同玩家+同桌台+时间相邻）';
    }
    return '';
  }, [opMode, selectedIds, selectedOccupancies, findAdjacentMergeable]);

  const splitHint = useMemo(() => {
    if (opMode !== 'split') return '';
    if (selectedIds.length === 0) return '请点击上方时间轴中要拆分的占用条';
    if (selectedIds.length >= 1) {
      const occ = selectedOccupancies[0];
      const now = Date.now();
      if (now <= occ.startAt || now >= occ.endAt) {
        return '⚠️ 当前时间不在该占用区间内，请选择正在进行中的占用';
      }
      return `✅ 已选中「${occ.tableName}-${occ.playerName}」，将在当前时间拆分，前半段立即结账`;
    }
    return '';
  }, [opMode, selectedIds, selectedOccupancies]);

  const handleSlotClick = (occ: Occupancy) => {
    if (opMode === 'browse') {
      if (occ.status === 'active') {
        Taro.navigateTo({
          url: `/pages/bill-detail/index?occupancyId=${occ.id}`
        });
      }
      return;
    }
    if (occ.status !== 'active') {
      Taro.showToast({ title: '只能操作进行中的占用', icon: 'none' });
      return;
    }
    if (opMode === 'split') {
      setSelectedIds([occ.id]);
      return;
    }
    if (opMode === 'merge') {
      if (selectedIds.includes(occ.id)) {
        setSelectedIds(prev => prev.filter(id => id !== occ.id));
      } else {
        if (selectedIds.length >= 2) {
          setSelectedIds([selectedIds[1], occ.id]);
        } else {
          setSelectedIds(prev => [...prev, occ.id]);
        }
      }
    }
  };

  const handleOpenTable = (tableId: string) => {
    if (opMode !== 'browse') return;
    Taro.navigateTo({
      url: `/pages/booking-detail/index?tableId=${tableId}&mode=create`
    });
  };

  const handleTableClick = (tableId: string) => {
    if (opMode !== 'browse') return;
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

  const handleEnterMerge = () => {
    setOpMode('merge');
    setSelectedIds([]);
    Taro.showToast({ title: '合并模式：选中2个占用', icon: 'none', duration: 1500 });
  };

  const handleEnterSplit = () => {
    setOpMode('split');
    setSelectedIds([]);
    Taro.showToast({ title: '拆分模式：选中1个占用', icon: 'none', duration: 1500 });
  };

  const handleCancelOp = () => {
    setOpMode('browse');
    setSelectedIds([]);
  };

  const handleExecuteMerge = () => {
    if (selectedIds.length < 2) {
      Taro.showToast({ title: '请先选择2个占用', icon: 'none' });
      return;
    }
    const [a, b] = [selectedOccupancies[0], selectedOccupancies[1]];
    if (!canMergeOccupancies(a, b)) {
      Taro.showModal({
        title: '无法合并',
        content: '两个占用需要：同桌台、同玩家、都进行中、时段相邻（5分钟内）',
        showCancel: false
      });
      return;
    }
    Taro.showModal({
      title: '确认合并',
      content: `合并「${a.tableName} ${a.playerName}」(${formatDate(a.startAt, 'HH:mm')}~${formatDate(a.endAt, 'HH:mm')}) 与 「${b.tableName} ${b.playerName}」(${formatDate(b.startAt, 'HH:mm')}~${formatDate(b.endAt, 'HH:mm')})，合并后按总时长统一计费`,
      success: (res) => {
        if (res.confirm) {
          const ok = mergeTwoOccupancies(a.id, b.id);
          if (ok) {
            setSelectedIds([]);
            setOpMode('browse');
          } else {
            Taro.showToast({ title: '合并失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleExecuteSplit = () => {
    if (selectedIds.length === 0) {
      Taro.showToast({ title: '请先选择要拆分的占用', icon: 'none' });
      return;
    }
    const occ = selectedOccupancies[0];
    const now = Date.now();
    if (now <= occ.startAt || now >= occ.endAt) {
      Taro.showToast({ title: '需拆分正在进行中的占用', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '确认拆分',
      content: `将在当前时间(${formatDate(now, 'HH:mm')})拆分「${occ.tableName} ${occ.playerName}」的占用。\n• 前半段：${formatDate(occ.startAt, 'HH:mm')}~${formatDate(now, 'HH:mm')} → 立即形成可结账账单\n• 后半段：${formatDate(now, 'HH:mm')}~${formatDate(occ.endAt, 'HH:mm')} → 保留进行中`,
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm) {
          const ok = splitOccupancyAt(occ.id, now, occ.playerName, '新顾客');
          if (ok) {
            setSelectedIds([]);
            setOpMode('browse');
          } else {
            Taro.showToast({ title: '拆分失败', icon: 'none' });
          }
        }
      }
    });
  };

  const dateRange = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const ts = todayStart() + d * 24 * 60 * 60 * 1000;
    return { ts, label: d === 0 ? '今天' : d === 1 ? '明天' : formatDate(ts, 'MM/DD') };
  });

  const canExecuteMerge = opMode === 'merge' && selectedIds.length >= 2 &&
    selectedOccupancies.length >= 2 && canMergeOccupancies(selectedOccupancies[0], selectedOccupancies[1]);

  const canExecuteSplit = opMode === 'split' && selectedIds.length >= 1 && (() => {
    const occ = selectedOccupancies[0];
    const now = Date.now();
    return occ && now > occ.startAt && now < occ.endAt;
  })();

  return (
    <>
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
          <View className={classnames('flexBetween')} style={{ marginBottom: '16rpx' }}>
            <Text className={styles.timelineTitle}>时间轴排期</Text>
            {opMode !== 'browse' && (
              <Text style={{ fontSize: '22rpx', color: '#E67E22', fontWeight: 600 }}>
                {opMode === 'merge' ? '合并模式（最多选2）' : '拆分模式（单选）'}
              </Text>
            )}
          </View>

          {opMode !== 'browse' && (
            <View className='card' style={{
              padding: '20rpx 24rpx',
              marginBottom: '24rpx',
              background: opMode === 'merge' ? 'linear-gradient(135deg, #FFF5E6 0%, #FFE8CC 100%)' : 'linear-gradient(135deg, #FFEBEE 0%, #FFE0E4 100%)',
              border: '1rpx solid',
              borderColor: opMode === 'merge' ? '#FFD7A8' : '#FFC8CE'
            }}>
              <Text style={{ fontSize: '24rpx', color: opMode === 'merge' ? '#A86A00' : '#C0392B', lineHeight: '1.6' }}>
                {opMode === 'merge' ? mergeHint : splitHint}
              </Text>
            </View>
          )}

          {tables.length > 0 ? (
            tables.map(table => (
              <TimeSlotBar
                key={table.id}
                tableName={table.name}
                occupancies={occupanciesByTable[table.id] || []}
                selectedIds={selectedIds}
                onSlotClick={handleSlotClick}
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

        <View style={{ height: opMode !== 'browse' ? '320rpx' : '220rpx' }} />
      </ScrollView>

      {opMode === 'browse' && (
        <View className={styles.operationsBar}>
          <Button className={styles.opBtn} onClick={handleEnterMerge}>
            <Text className={styles.opBtnText}>🔗 合并占用</Text>
          </Button>
          <Button className={classnames(styles.opBtn, styles.opBtnPrimary)} onClick={handleEnterSplit}>
            <Text className={styles.opBtnText}>✂️ 拆分占用</Text>
          </Button>
        </View>
      )}

      {opMode === 'merge' && (
        <View className={styles.operationsBar} style={{ flexDirection: 'column', gap: '16rpx' }}>
          <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
            <Button className={styles.opBtn} onClick={handleCancelOp}>
              <Text className={styles.opBtnText}>取消</Text>
            </Button>
            <Button
              className={classnames(styles.opBtn, styles.opBtnPrimary)}
              style={{ opacity: canExecuteMerge ? 1 : 0.5 }}
              onClick={handleExecuteMerge}
              disabled={!canExecuteMerge}
            >
              <Text className={styles.opBtnText}>
                执行合并 ({selectedIds.length}/2)
              </Text>
            </Button>
          </View>
        </View>
      )}

      {opMode === 'split' && (
        <View className={styles.operationsBar} style={{ flexDirection: 'column', gap: '16rpx' }}>
          <View style={{ display: 'flex', gap: '16rpx', width: '100%' }}>
            <Button className={styles.opBtn} onClick={handleCancelOp}>
              <Text className={styles.opBtnText}>取消</Text>
            </Button>
            <Button
              className={classnames(styles.opBtn, styles.opBtnPrimary)}
              style={{ opacity: canExecuteSplit ? 1 : 0.5 }}
              onClick={handleExecuteSplit}
              disabled={!canExecuteSplit}
            >
              <Text className={styles.opBtnText}>
                在当前时间拆分
              </Text>
            </Button>
          </View>
        </View>
      )}
    </>
  );
};

export default SchedulePage;
