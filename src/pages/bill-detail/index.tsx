import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Button, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import Tag from '../../components/Tag';
import { formatDate, formatDuration, generateId, getHoursDiff } from '../../utils/time';
import { GameRental } from '../../types';

const statusConfig = {
  unpaid: { label: '待结账', className: styles.statusUnpaid, actions: ['pay', 'discount'] },
  paid: { label: '已结账', className: styles.statusPaid, actions: ['refund'] },
  refunded: { label: '已退款', className: styles.statusRefunded, actions: [] }
};

const BillDetailPage: React.FC = () => {
  const router = useRouter();
  const {
    bills, payBill, refundBill, updateBillDiscount,
    returnGame, occupancies, endOccupancy,
    createBillFromOccupancy, splitOccupancyAt
  } = useStore();

  const billId = router.params.billId || '';
  const occupancyId = router.params.occupancyId || '';

  const [discountInput, setDiscountInput] = useState('');

  const targetBill = useMemo(() => {
    if (billId) return bills.find(b => b.id === billId);
    if (occupancyId) {
      const existing = bills.find(b => b.occupancyIds.includes(occupancyId));
      if (existing) return existing;
    }
    return null;
  }, [bills, billId, occupancyId]);

  const occ = useMemo(() => {
    if (occupancyId) return occupancies.find(o => o.id === occupancyId);
    if (targetBill?.occupancyIds?.[0]) return occupancies.find(o => o.id === targetBill.occupancyIds[0]);
    return null;
  }, [occupancies, occupancyId, targetBill]);

  const bill = targetBill;
  const status = bill ? statusConfig[bill.status] : statusConfig.unpaid;

  const handlePay = () => {
    if (!bill) return;
    Taro.showModal({
      title: '确认结账',
      content: `确认收取 ¥${bill.totalAmount.toFixed(2)} 并完成结账？`,
      confirmColor: '#2ECC71',
      success: (res) => {
        if (res.confirm) {
          if (occ && occ.status === 'active') {
            endOccupancy(occ.id);
          }
          payBill(bill.id);
          Taro.showToast({ title: '结账成功', icon: 'success' });
        }
      }
    });
  };

  const handleRefund = () => {
    if (!bill) return;
    Taro.showModal({
      title: '确认退款',
      content: `确定要退款 ¥${bill.totalAmount.toFixed(2)} 吗？此操作不可撤销。`,
      confirmColor: '#E74C3C',
      success: (res) => {
        if (res.confirm) {
          refundBill(bill.id);
          Taro.showToast({ title: '退款成功', icon: 'success' });
        }
      }
    });
  };

  const handleApplyDiscount = () => {
    if (!bill) return;
    const amount = parseFloat(discountInput);
    if (isNaN(amount) || amount < 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    if (amount > bill.tableFee + bill.gameRentalFee) {
      Taro.showToast({ title: '优惠金额过大', icon: 'none' });
      return;
    }
    updateBillDiscount(bill.id, Math.round(amount * 100) / 100);
    Taro.showToast({ title: '已应用优惠', icon: 'success' });
    setDiscountInput('');
  };

  const handleSplit = () => {
    if (!occ) return;
    Taro.showModal({
      title: '中途散场拆分',
      content: `将在当前时间拆分「${occ.tableName}」的占用，前半段立即结账。确认吗？`,
      confirmColor: '#FF7A45',
      success: (res) => {
        if (res.confirm) {
          const ok = splitOccupancyAt(occ.id, Date.now(), occ.playerName, '新顾客');
          if (ok) {
            Taro.showToast({ title: '拆分成功', icon: 'success' });
            setTimeout(() => Taro.navigateBack(), 600);
          }
        }
      }
    });
  };

  const handleReturnGame = (rentalId: string) => {
    Taro.showModal({
      title: '归还桌游',
      content: '确认归还此桌游？',
      success: (res) => {
        if (res.confirm) {
          returnGame(rentalId);
          Taro.showToast({ title: '归还成功', icon: 'success' });
        }
      }
    });
  };

  if (!bill && !occ) {
    return (
      <ScrollView className={styles.page}>
        <View style={{ padding: '100rpx 0', textAlign: 'center' }}>
          <Text style={{ color: '#8C7878', fontSize: '28rpx' }}>未找到账单信息</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={classnames(styles.statusBanner, status.className)}>
        <View className={styles.statusBadge}>{status.label}</View>
        <View>
          <Text className={styles.statusAmountUnit}>¥</Text>
          <Text className={styles.statusAmount}>
            {bill ? bill.totalAmount.toFixed(2) : '--'}
          </Text>
        </View>
        <Text className={styles.statusOrderNo}>
          {bill ? `订单号：${bill.orderNo}` : occ ? `桌台：${occ.tableName}` : ''}
        </Text>
      </View>

      {bill && (
        <>
          <View className={styles.infoCard}>
            <Text className={styles.infoCardTitle}>📋 基本信息</Text>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>桌台</Text>
              <Text className={styles.infoValue}>{bill.tableName}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>玩家</Text>
              <Text className={styles.infoValue}>
                {bill.playerName}
                {bill.playerPhone ? ` · ${bill.playerPhone}` : ''}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>开始时间</Text>
              <Text className={styles.infoValue}>{formatDate(bill.startAt)}</Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>结束时间</Text>
              <Text className={styles.infoValue}>
                {bill.endAt ? formatDate(bill.endAt) : occ ? `预计 ${formatDate(occ.endAt)}` : '进行中'}
              </Text>
            </View>
            <View className={styles.infoRow}>
              <Text className={styles.infoLabel}>使用时长</Text>
              <Text className={styles.infoValue} style={{ color: '#FF7A45', fontWeight: 600 }}>
                {formatDuration(bill.totalHours)}
              </Text>
            </View>
          </View>

          <View className={styles.infoCard}>
            <Text className={styles.infoCardTitle}>💰 费用明细</Text>
            <View className={styles.breakdownList}>
              {bill.pricingBreakdown.map((b, idx) => (
                <View key={b.tierId} className={styles.breakdownItem}>
                  <View className={styles.breakdownLeft}>
                    <View className={styles.breakdownIndex}>
                      <Text className={styles.breakdownIndexText}>{idx + 1}</Text>
                    </View>
                    <View className={styles.breakdownInfo}>
                      <Text className={styles.breakdownName}>{b.tierName}</Text>
                      <Text className={styles.breakdownRate}>¥{b.tierRate}/小时</Text>
                    </View>
                  </View>
                  <View className={styles.breakdownRight}>
                    <Text className={styles.breakdownHours}>× {b.hoursUsed.toFixed(1)}h</Text>
                    <Text className={styles.breakdownSubtotal}>¥{b.subtotal.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View className={styles.totalSection}>
              <View className={styles.totalRow}>
                <Text className={styles.totalLabel}>台费小计</Text>
                <Text className={styles.totalValue}>¥{bill.tableFee.toFixed(2)}</Text>
              </View>
              {bill.gameRentalFee > 0 && (
                <View className={styles.totalRow}>
                  <Text className={styles.totalLabel}>桌游服务费</Text>
                  <Text className={styles.totalValue}>¥{bill.gameRentalFee.toFixed(2)}</Text>
                </View>
              )}
              {bill.discount > 0 && (
                <View className={classnames(styles.totalRow, styles.discountRow)}>
                  <Text className={styles.totalLabel}>优惠减免</Text>
                  <Text className={styles.totalValue}>-¥{bill.discount.toFixed(2)}</Text>
                </View>
              )}
              <View className={classnames(styles.totalRow, styles.finalRow)}>
                <Text className={styles.totalLabel}>应付总额</Text>
                <Text className={styles.totalValue}>¥{bill.totalAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {bill.status === 'unpaid' && (
            <View className={styles.infoCard}>
              <Text className={styles.infoCardTitle}>🎟️ 应用优惠</Text>
              <View className={styles.infoRow}>
                <Input
                  className={styles.infoValue}
                  type='digit'
                  placeholder='输入优惠金额（元）'
                  value={discountInput}
                  onInput={(e) => setDiscountInput(e.detail.value)}
                  style={{ textAlign: 'left', padding: '12rpx 0', borderBottom: '1rpx solid #F4EBE5', marginRight: '16rpx' }}
                />
                <Button
                  className={classnames(styles.secondaryBtn, styles.primaryBtn)}
                  style={{ height: '64rpx', flex: 'none', width: '160rpx', fontSize: '24rpx' }}
                  onClick={handleApplyDiscount}
                >
                  应用
                </Button>
              </View>
            </View>
          )}

          <View className={styles.infoCard}>
            <Text className={styles.infoCardTitle}>🎲 桌游借用 ({bill.gameRentals.length})</Text>
            {bill.gameRentals.length > 0 ? (
              <View className={styles.gameList}>
                {bill.gameRentals.map(rental => (
                  <View key={rental.id} className={styles.gameRentalItem}>
                    <View className={styles.gameRentalIcon}>🎲</View>
                    <View className={styles.gameRentalInfo}>
                      <Text className={styles.gameRentalName}>{rental.gameName}</Text>
                      <Text className={styles.gameRentalTime}>
                        借出：{formatDate(rental.rentedAt, 'HH:mm')}
                        {rental.returnedAt && ` · 归还：${formatDate(rental.returnedAt, 'HH:mm')}`}
                      </Text>
                    </View>
                    {rental.status === 'rented' && (
                      <Button
                        className={styles.gameReturnBtn}
                        onClick={() => handleReturnGame(rental.id)}
                      >
                        归还
                      </Button>
                    )}
                    {rental.status === 'returned' && (
                      <Tag text='已归还' type='success' size='sm' />
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ padding: '32rpx 0', textAlign: 'center', color: '#8C7878', fontSize: '24rpx' }}>
                本单暂无桌游借用
              </View>
            )}
          </View>

          {occ?.status === 'active' && (
            <View className={styles.infoCard}>
              <Text className={styles.infoCardTitle}>⚙️ 占用操作</Text>
              <View className={styles.infoRow}>
                <Button
                  className={classnames(styles.secondaryBtn)}
                  style={{ flex: 1, height: '80rpx' }}
                  onClick={handleSplit}
                >
                  中途散场拆分
                </Button>
              </View>
            </View>
          )}

          <View style={{ height: '40rpx' }} />

          <View className={styles.bottomBar}>
            {bill.status === 'unpaid' && (
              <>
                <Button
                  className={classnames(styles.secondaryBtn)}
                  style={{ width: '200rpx' }}
                  onClick={() => Taro.navigateBack()}
                >
                  返回
                </Button>
                <Button className={styles.primaryBtn} onClick={handlePay}>
                  立即结账 ¥{bill.totalAmount.toFixed(2)}
                </Button>
              </>
            )}
            {bill.status === 'paid' && (
              <>
                <Button
                  className={classnames(styles.secondaryBtn)}
                  onClick={() => Taro.navigateBack()}
                >
                  返回
                </Button>
                <Button
                  className={classnames(styles.primaryBtn, styles.refundBtn)}
                  onClick={handleRefund}
                >
                  申请退款
                </Button>
              </>
            )}
            {bill.status === 'refunded' && (
              <Button
                className={classnames(styles.secondaryBtn)}
                style={{ flex: 1 }}
                onClick={() => Taro.navigateBack()}
              >
                返回列表
              </Button>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default BillDetailPage;
