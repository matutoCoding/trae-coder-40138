import React, { useMemo } from 'react';
import { View, Text, ScrollView, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';

const SettingsPage: React.FC = () => {
  const { tables, games, tiers, bills, occupancies } = useStore();

  const quickStats = useMemo(() => ({
    tables: tables.length,
    games: games.length,
    tiers: tiers.filter(t => t.enabled).length,
    activeBills: bills.filter(b => b.status === 'unpaid').length
  }), [tables, games, tiers, bills]);

  const menuItems = [
    {
      key: 'tables',
      icon: '🪑',
      iconClass: styles.menuIconTables,
      title: '桌台建档',
      desc: `共 ${quickStats.tables} 张桌台，点击管理`,
      badge: quickStats.tables,
      onClick: () => Taro.navigateTo({ url: '/pages/table-edit/index?mode=list' })
    },
    {
      key: 'games',
      icon: '🎲',
      iconClass: styles.menuIconGames,
      title: '桌游管理',
      desc: `共 ${quickStats.games} 款桌游，借还登记`,
      onClick: () => Taro.navigateTo({ url: '/pages/game-manage/index' })
    },
    {
      key: 'pricing',
      icon: '💰',
      iconClass: styles.menuIconPricing,
      title: '阶梯档位维护',
      desc: `${quickStats.tiers} 个档位已启用`,
      onClick: () => Taro.switchTab({ url: '/pages/pricing/index' })
    },
    {
      key: 'bills',
      icon: '📋',
      iconClass: styles.menuIconBills,
      title: '账单历史',
      desc: `${quickStats.activeBills} 单待结账`,
      badge: quickStats.activeBills > 0 ? quickStats.activeBills : 0,
      onClick: () => Taro.switchTab({ url: '/pages/bills/index' })
    },
    {
      key: 'data',
      icon: '📊',
      iconClass: styles.menuIconData,
      title: '经营数据',
      desc: '营业额、客流量、热门桌台',
      onClick: () => Taro.showToast({ title: '开发中...', icon: 'none' })
    },
    {
      key: 'about',
      icon: 'ℹ️',
      iconClass: styles.menuIconAbout,
      title: '关于系统',
      desc: '版本 1.0.0 · 桌游吧管家',
      onClick: () => Taro.showModal({
        title: '关于桌游吧管家',
        content: '桌游吧开台管理系统\n版本：1.0.0\n\n功能模块：\n· 桌台排期管理\n· 占用合并拆分\n· 阶梯计费计价\n· 账单生成结算\n· 桌游借还登记',
        showCancel: false
      })
    }
  ];

  const quickActions = [
    {
      key: 'addTable',
      icon: '🪑',
      iconClass: styles.menuIconTables,
      title: '新增桌台',
      desc: '创建新的桌台档案',
      onClick: () => Taro.navigateTo({ url: '/pages/table-edit/index?mode=create' })
    },
    {
      key: 'addGame',
      icon: '🎲',
      iconClass: styles.menuIconGames,
      title: '添加桌游',
      desc: '录入新的桌游条目',
      onClick: () => Taro.showToast({ title: '请到桌游管理页添加', icon: 'none' })
    }
  ];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className='pageTitle'>管理设置</View>

      <View className={styles.profileCard}>
        <View className={styles.avatarBox}>
          <Text className={styles.avatarText}>🎯</Text>
        </View>
        <View className={styles.profileInfo}>
          <Text className={styles.profileName}>桌游吧管理员</Text>
          <Text className={styles.profileRole}>超级管理员 · 全部权限</Text>
        </View>
      </View>

      <View className={styles.statsMini}>
        <View className={styles.statsMiniItem}>
          <Text className={styles.statsMiniLabel}>桌台数量</Text>
          <Text className={styles.statsMiniValue}>{quickStats.tables}</Text>
        </View>
        <View className={styles.statsMiniItem}>
          <Text className={styles.statsMiniLabel}>桌游数量</Text>
          <Text className={styles.statsMiniValue}>{quickStats.games}</Text>
        </View>
        <View className={styles.statsMiniItem}>
          <Text className={styles.statsMiniLabel}>启用档位</Text>
          <Text className={styles.statsMiniValue}>{quickStats.tiers}</Text>
        </View>
        <View className={styles.statsMiniItem}>
          <Text className={styles.statsMiniLabel}>进行中</Text>
          <Text className={styles.statsMiniValue} style={{ color: '#E67E22' }}>{quickStats.activeBills}</Text>
        </View>
      </View>

      <View className={styles.menuSection}>
        <Text className='sectionTitle'>快捷操作</Text>
        <View className={styles.menuCard}>
          {quickActions.map(item => (
            <View key={item.key} className={styles.menuItem} onClick={item.onClick}>
              <View className={classnames(styles.menuIcon, item.iconClass)}>
                <Text>{item.icon}</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>{item.title}</Text>
                <Text className={styles.menuDesc}>{item.desc}</Text>
              </View>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.menuSection}>
        <Text className='sectionTitle'>系统管理</Text>
        <View className={styles.menuCard}>
          {menuItems.map(item => (
            <View key={item.key} className={styles.menuItem} onClick={item.onClick}>
              <View className={classnames(styles.menuIcon, item.iconClass)}>
                <Text>{item.icon}</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>{item.title}</Text>
                <Text className={styles.menuDesc}>{item.desc}</Text>
              </View>
              {item.badge && item.badge > 0 && <View className={styles.badge}>{item.badge}</View>}
              <Text className={styles.menuArrow}>›</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: '60rpx' }} />
    </ScrollView>
  );
};

export default SettingsPage;
