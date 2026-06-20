import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import BillCard from '../../components/BillCard';
import EmptyState from '../../components/EmptyState';

type TabType = 'all' | 'unpaid' | 'paid' | 'refunded';

const tabLabels: Record<TabType, string> = {
  all: '全部',
  unpaid: '待结账',
  paid: '已结账',
  refunded: '已退款'
};

const BillsPage: React.FC = () => {
  const { bills, payBill, refundBill } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const summary = useMemo(() => {
    return {
      total: bills.length,
      unpaid: bills.filter(b => b.status === 'unpaid').length,
      paid: bills.filter(b => b.status === 'paid').length,
      todayTotal: bills
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.totalAmount, 0)
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let list = bills;
    if (activeTab !== 'all') {
      list = list.filter(b => b.status === activeTab);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(b =>
        b.orderNo.toLowerCase().includes(q) ||
        b.playerName.toLowerCase().includes(q) ||
        b.tableName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [bills, activeTab, searchText]);

  const handleBillClick = (billId: string) => {
    Taro.navigateTo({
      url: `/pages/bill-detail/index?billId=${billId}`
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <ScrollView
      scrollY
      className={styles.page}
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      <View className='pageTitle'>账单中心</View>

      <View className={styles.summaryCard}>
        <View className={styles.summaryRow}>
          <View className={styles.summaryCol}>
            <Text className={styles.summaryNum}>{summary.total}</Text>
            <Text className={styles.summaryLabel}>总单数</Text>
          </View>
          <View className={styles.summaryCol}>
            <Text className={styles.summaryNum}>{summary.unpaid}</Text>
            <Text className={styles.summaryLabel}>待结账</Text>
          </View>
          <View className={styles.summaryCol}>
            <Text className={styles.summaryNum}>{summary.paid}</Text>
            <Text className={styles.summaryLabel}>已完成</Text>
          </View>
        </View>
        <View className={styles.summaryAmount}>
          <Text className={styles.summaryAmountLabel}>今日营收</Text>
          <View>
            <Text className={styles.summaryAmountUnit}>¥</Text>
            <Text className={styles.summaryAmountValue}>{summary.todayTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View className={styles.tabsBar}>
        {(Object.keys(tabLabels) as TabType[]).map(tab => (
          <View
            key={tab}
            className={classnames(styles.tabItem, activeTab === tab && styles.tabItemActive)}
            onClick={() => setActiveTab(tab)}
          >
            <Text>{tabLabels[tab]}</Text>
          </View>
        ))}
      </View>

      <View className={styles.searchBox}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          placeholder='搜索订单号/玩家/桌台'
          placeholderClass={styles.searchPlaceholder as any}
          value={searchText}
          onInput={(e) => setSearchText(e.detail.value)}
        />
      </View>

      <Text className='sectionTitle' style={{ marginBottom: '20rpx' }}>
        账单列表 ({filteredBills.length})
      </Text>

      {filteredBills.length > 0 ? (
        filteredBills.map(bill => (
          <BillCard
            key={bill.id}
            bill={bill}
            onClick={() => handleBillClick(bill.id)}
          />
        ))
      ) : (
        <EmptyState
          title='暂无账单'
          description={searchText ? '没有找到匹配的账单' : '开台后会自动生成账单'}
        />
      )}

      <View style={{ height: '60rpx' }} />
    </ScrollView>
  );
};

export default BillsPage;
