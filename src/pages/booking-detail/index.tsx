import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Input, Picker, Button } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import Tag from '../../components/Tag';
import { calculatePricing, formatApproachingNotice } from '../../utils/pricing';
import { formatDate, addHours, formatDuration, todayStart, generateId } from '../../utils/time';
import { TableType } from '../../types';

const presetDurations = [1, 2, 3, 4, 6, 8];

const BookingDetailPage: React.FC = () => {
  const router = useRouter();
  const { tables, tiers, createOccupancyWithAutoMerge, games } = useStore();

  const tableId = router.params.tableId || '';
  const table = useMemo(() => tables.find(t => t.id === tableId), [tables, tableId]);

  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [duration, setDuration] = useState(3);
  const [customStart, setCustomStart] = useState<number>(Date.now());
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  const endTime = useMemo(() => addHours(customStart, duration), [customStart, duration]);
  const pricing = useMemo(() => calculatePricing(duration, tiers), [duration, tiers]);
  const warningText = formatApproachingNotice(pricing.approachingTier);

  const startHourOptions = useMemo(() => {
    const options = [];
    for (let h = 8; h <= 23; h++) {
      const ts = todayStart() + h * 60 * 60 * 1000;
      options.push({
        ts,
        label: `${h.toString().padStart(2, '0')}:00`
      });
    }
    return options;
  }, []);

  const startIdx = useMemo(() => {
    const hour = new Date(customStart).getHours();
    return Math.max(0, Math.min(startHourOptions.length - 1, hour - 8));
  }, [customStart, startHourOptions]);

  const handleToggleGame = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if (!game || game.availableQty <= 0) return;
    setSelectedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  const handleConfirm = () => {
    if (!playerName.trim()) {
      Taro.showToast({ title: '请输入玩家姓名', icon: 'none' });
      return;
    }
    if (!table) {
      Taro.showToast({ title: '请选择桌台', icon: 'none' });
      return;
    }
    const result = createOccupancyWithAutoMerge({
      tableId: table.id,
      playerName: playerName.trim(),
      playerPhone: playerPhone.trim(),
      startAt: customStart,
      endAt: endTime,
      selectedGameIds: selectedGames
    });
    if (!result.success) {
      return;
    }
    Taro.showToast({ title: '开台成功', icon: 'success' });
    setTimeout(() => {
      if (result.billId) {
        Taro.redirectTo({
          url: `/pages/bill-detail/index?billId=${result.billId}`
        });
      } else if (result.occupancyId) {
        Taro.redirectTo({
          url: `/pages/bill-detail/index?occupancyId=${result.occupancyId}`
        });
      } else {
        Taro.navigateBack();
      }
    }, 600);
  };

  if (!table) {
    return (
      <ScrollView className={styles.page}>
        <View style={{ padding: '100rpx 0', textAlign: 'center' }}>
          <Text style={{ color: '#8C7878', fontSize: '28rpx' }}>未找到桌台信息</Text>
        </View>
      </ScrollView>
    );
  }

  const tableTypeOptions = tables.map(t => t.name);
  const currentTableIdx = tables.findIndex(t => t.id === tableId);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className='pageTitle'>开台登记</View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>🪑</Text>
          桌台信息
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>选择桌台</Text>
          <Picker
            mode='selector'
            range={tableTypeOptions}
            value={currentTableIdx >= 0 ? currentTableIdx : 0}
            onChange={(e) => {
              const idx = e.detail.value;
              const newTable = tables[idx];
              if (newTable) {
                Taro.redirectTo({
                  url: `/pages/booking-detail/index?tableId=${newTable.id}&mode=create`
                });
              }
            }}
          >
            <Text className={styles.formValue}>
              {table.name} ›
            </Text>
          </Picker>
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>桌台类型</Text>
          <Text className={styles.formValue}>{table.type}</Text>
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>容纳人数</Text>
          <Text className={styles.formValue}>{table.capacity}人</Text>
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>基础时薪</Text>
          <Text className={styles.formValue} style={{ color: '#FF7A45' }}>¥{table.baseRate}/小时</Text>
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>👤</Text>
          玩家信息
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>玩家姓名</Text>
          <Input
            className={styles.formInput}
            placeholder='请输入姓名'
            placeholderClass={styles.formPlaceholder as any}
            value={playerName}
            onInput={(e) => setPlayerName(e.detail.value)}
          />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>联系电话</Text>
          <Input
            className={styles.formInput}
            type='number'
            placeholder='选填'
            placeholderClass={styles.formPlaceholder as any}
            value={playerPhone}
            onInput={(e) => setPlayerPhone(e.detail.value)}
            maxlength={11}
          />
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>⏰</Text>
          时间设置
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>开始时间</Text>
          <Picker
            mode='selector'
            range={startHourOptions.map(o => o.label)}
            value={startIdx}
            onChange={(e) => setCustomStart(startHourOptions[e.detail.value].ts)}
          >
            <Text className={styles.formValue}>
              {formatDate(customStart, '今天 HH:mm')} ›
            </Text>
          </Picker>
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>使用时长</Text>
          <Text className={styles.formValue}>{formatDuration(duration)}</Text>
        </View>
        <View className={styles.durationRow}>
          {presetDurations.map(h => (
            <Button
              key={h}
              className={classnames(styles.durationBtn, duration === h && styles.durationBtnActive)}
              onClick={() => setDuration(h)}
            >
              {h}小时
            </Button>
          ))}
        </View>
        <View className={styles.formRow} style={{ marginTop: '16rpx' }}>
          <Text className={styles.formLabel}>预计结束</Text>
          <Text className={styles.formValue} style={{ color: '#6B4C9A' }}>
            {formatDate(endTime, 'HH:mm')}
          </Text>
        </View>
      </View>

      <View className={styles.gameSection}>
        <Text className='sectionTitle'>🎲 借桌游（可选）</Text>
        {games.slice(0, 4).map(game => (
          <View key={game.id} className={styles.gameItem} onClick={() => handleToggleGame(game.id)}>
            <View className={styles.gameInfo}>
              <Text className={styles.gameName}>{game.name}</Text>
              <Text className={styles.gameMeta}>
                {game.category} · {game.players}
              </Text>
            </View>
            <View
              className={classnames(
                styles.gameStatus,
                game.availableQty > 0 ? styles.gameAvailable : styles.gameUnavailable
              )}
            >
              {game.availableQty > 0 ? `剩${game.availableQty}份` : '已借完'}
            </View>
            {selectedGames.includes(game.id) && (
              <View style={{ marginLeft: '16rpx', color: '#FF7A45', fontWeight: 700 }}>✓</View>
            )}
          </View>
        ))}
      </View>

      {warningText && (
        <View className={styles.warningBox}>
          <Text className={styles.warningIcon}>⚠️</Text>
          <Text className={styles.warningText}>{warningText}</Text>
        </View>
      )}

      <View className={styles.estimateCard}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, marginBottom: '24rpx', display: 'block', opacity: 0.95 }}>
          📊 费用预估
        </Text>
        <View className={styles.estimateRow}>
          <Text className={styles.estimateLabel}>使用时长</Text>
          <Text className={styles.estimateValue}>{formatDuration(pricing.totalHours)}</Text>
        </View>
        {pricing.breakdown.map((b, i) => (
          <View key={b.tierId} className={styles.estimateRow}>
            <Text className={styles.estimateLabel}>
              档位{i + 1} · {b.tierName} × {b.hoursUsed.toFixed(1)}h
            </Text>
            <Text className={styles.estimateValue}>¥{b.subtotal.toFixed(2)}</Text>
          </View>
        ))}
        <View className={styles.estimateTotal}>
          <Text className={styles.estimateTotalLabel}>预计合计</Text>
          <View>
            <Text className={styles.estimateTotalUnit}>¥</Text>
            <Text className={styles.estimateTotalValue}>{pricing.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: '40rpx' }} />

      <View className={styles.bottomBar}>
        <Button className={styles.cancelBtn} onClick={handleCancel}>取消</Button>
        <Button className={styles.confirmBtn} onClick={handleConfirm}>确认开台</Button>
      </View>
    </ScrollView>
  );
};

export default BookingDetailPage;
