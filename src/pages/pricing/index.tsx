import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Button, Slider, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import PricingTierCard from '../../components/PricingTierCard';
import Tag from '../../components/Tag';
import EmptyState from '../../components/EmptyState';
import { calculatePricing, formatApproachingNotice, validateTier } from '../../utils/pricing';
import { formatDuration } from '../../utils/time';
import { PricingTier } from '../../types';

const PricingPage: React.FC = () => {
  const { tiers, addTier, updateTier, deleteTier, toggleTierEnabled } = useStore();
  const [simHours, setSimHours] = useState(3);

  const pricing = useMemo(() => calculatePricing(simHours, tiers), [simHours, tiers]);
  const warningText = formatApproachingNotice(pricing.approachingTier);
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.tierIndex - b.tierIndex), [tiers]);

  const presetHours = [1, 2, 3, 4, 6, 8];

  const handleAddTier = () => {
    Taro.showModal({
      title: '新增档位',
      editable: true,
      placeholderText: '请输入档位名称，如：夜间档',
      success: (nameRes) => {
        if (!nameRes.confirm || !nameRes.content) return;
        const nextIndex = sortedTiers.length > 0
          ? Math.max(...sortedTiers.map(t => t.tierIndex)) + 1
          : 1;
        addTier({
          name: nameRes.content,
          tierIndex: nextIndex,
          startHour: nextIndex * 2,
          endHour: nextIndex * 2 + 2,
          rate: 20 + nextIndex * 5,
          description: '自定义档位',
          enabled: true
        });
        Taro.showToast({ title: '档位已添加', icon: 'success' });
      }
    });
  };

  const handleEditTier = (tier: PricingTier) => {
    Taro.showModal({
      title: `编辑「${tier.name}」单价`,
      editable: true,
      placeholderText: `当前 ¥${tier.rate}/小时`,
      success: (res) => {
        if (!res.confirm || !res.content) return;
        const rate = parseFloat(res.content);
        if (isNaN(rate) || rate < 0) {
          Taro.showToast({ title: '请输入有效金额', icon: 'none' });
          return;
        }
        updateTier(tier.id, { rate });
        Taro.showToast({ title: '已更新', icon: 'success' });
      }
    });
  };

  const handleDeleteTier = (tier: PricingTier) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定删除档位「${tier.name}」吗？删除后无法恢复。`,
      confirmColor: '#E74C3C',
      success: (res) => {
        if (res.confirm) {
          deleteTier(tier.id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className='pageTitle'>阶梯计费管理</View>

      <View className={styles.calculatorCard}>
        <Text className={styles.calcTitle}>📊 费用计算器</Text>

        <View className={styles.calcMain}>
          <View>
            <Text className={styles.calcHoursLabel}>使用时长</Text>
            <View>
              <Text className={styles.calcHoursValue}>{simHours}</Text>
              <Text className={styles.calcHoursUnit}>小时</Text>
            </View>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text className={styles.calcTotalLabel}>预计费用</Text>
            <Text className={styles.calcTotalValue}>¥{pricing.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View className={styles.sliderWrapper}>
          <View className={styles.sliderTrack}>
            <View
              className={styles.sliderFill}
              style={{ width: `${(simHours / 12) * 100}%` }}
            />
            <View
              className={styles.sliderHandle}
              style={{ left: `${(simHours / 12) * 100}%` }}
            />
          </View>
          <Slider
            min={0.5}
            max={12}
            step={0.5}
            value={simHours}
            activeColor='#FFFFFF'
            backgroundColor='rgba(255,255,255,0.2)'
            blockSize={24}
            blockColor='#FFFFFF'
            onChange={(e) => setSimHours(e.detail.value)}
            style={{ marginLeft: -8, marginRight: -8, opacity: 0, position: 'absolute', width: '100%' }}
          />
          <View className={styles.sliderLabels}>
            {[0, 3, 6, 9, 12].map(h => (
              <Text key={h} className={styles.sliderLabel}>{h}h</Text>
            ))}
          </View>
        </View>

        <View className={styles.calcButtons}>
          {presetHours.map(h => (
            <Button
              key={h}
              className={classnames(styles.calcBtn, simHours === h && styles.calcBtnActive)}
              onClick={() => setSimHours(h)}
            >
              {h}h
            </Button>
          ))}
        </View>
      </View>

      {warningText && (
        <View className={styles.warningBanner}>
          <Text className={styles.warningIcon}>⚠️</Text>
          <Text className={styles.warningText}>{warningText}</Text>
        </View>
      )}

      <View className={styles.breakdownCard}>
        <Text className={styles.breakdownTitle}>💰 费用明细 ({formatDuration(pricing.totalHours)})</Text>
        {pricing.breakdown.length > 0 ? (
          <>
            <View className={styles.breakdownList}>
              {pricing.breakdown.map((b, idx) => (
                <View key={b.tierId} className={styles.breakdownItem}>
                  <View className={styles.bdItemLeft}>
                    <View className={styles.bdTierBadge}>
                      <Text className={styles.bdTierBadgeText}>{idx + 1}</Text>
                    </View>
                    <View className={styles.bdTierInfo}>
                      <Text className={styles.bdTierName}>{b.tierName}</Text>
                      <Text className={styles.bdTierRate}>¥{b.tierRate}/小时</Text>
                    </View>
                  </View>
                  <View className={styles.bdItemRight}>
                    <Text className={styles.bdHours}>× {b.hoursUsed.toFixed(1)}h</Text>
                    <Text className={styles.bdSubtotal}>¥{b.subtotal.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className={styles.breakdownSummary}>
              <Text className={styles.bsLabel}>合计</Text>
              <Text className={styles.bsValue}>¥{pricing.totalAmount.toFixed(2)}</Text>
            </View>
          </>
        ) : (
          <EmptyState title='暂无档位配置' description='请先在下方添加计费档位' />
        )}
      </View>

      <View className={styles.tiersHeader}>
        <Text className={styles.tiersTitle}>档位配置</Text>
        <Button className={styles.addTierBtn} onClick={handleAddTier}>+ 新增档位</Button>
      </View>

      {sortedTiers.length > 0 ? (
        sortedTiers.map(tier => (
          <PricingTierCard
            key={tier.id}
            tier={tier}
            actionMode='manage'
            onToggle={() => toggleTierEnabled(tier.id)}
            onEdit={() => handleEditTier(tier)}
            onDelete={() => handleDeleteTier(tier)}
          />
        ))
      ) : (
        <EmptyState title='暂无限位配置' description='点击上方按钮添加第一个档位' />
      )}

      <View style={{ height: '60rpx' }} />
    </ScrollView>
  );
};

export default PricingPage;
