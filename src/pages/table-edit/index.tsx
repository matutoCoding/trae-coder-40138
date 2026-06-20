import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import Tag from '../../components/Tag';
import EmptyState from '../../components/EmptyState';
import { TableStatus } from '../../types';

const TABLE_TYPES = ['标准桌', '大包厢', '小包厢', '情侣桌', '竞赛桌'];
const LOCATIONS = ['大厅A区', '大厅B区', '大厅C区', '包厢区', 'VIP区'];
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'free', label: '空闲' },
  { key: 'occupied', label: '占用' },
  { key: 'reserved', label: '预约' }
];

const TableEditPage: React.FC = () => {
  const router = useRouter();
  const mode = (router.params.mode as 'list' | 'create' | 'edit') || 'list';
  const editId = router.params.id || '';

  const { tables, addTable, updateTable, deleteTable } = useStore();

  const [filter, setFilter] = useState<string>('all');
  const [name, setName] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [type, setType] = useState(TABLE_TYPES[0]);
  const [capacity, setCapacity] = useState(4);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [baseRate, setBaseRate] = useState('15');
  const [status, setStatus] = useState<TableStatus>('free');

  const editingTable = useMemo(() => {
    if (mode === 'edit' && editId) {
      return tables.find(t => t.id === editId);
    }
    return null;
  }, [tables, mode, editId]);

  React.useEffect(() => {
    if (editingTable) {
      setName(editingTable.name);
      setTableNo(editingTable.tableNo);
      setType(editingTable.type);
      setCapacity(editingTable.capacity);
      setLocation(editingTable.location);
      setBaseRate(String(editingTable.baseRate));
      setStatus(editingTable.status);
    }
  }, [editingTable]);

  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    return tables.filter(t => t.status === filter);
  }, [tables, filter]);

  const stats = useMemo(() => ({
    total: tables.length,
    free: tables.filter(t => t.status === 'free').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length
  }), [tables]);

  const handleDelete = (id: string, tableName: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定删除桌台「${tableName}」吗？此操作不可恢复。`,
      confirmColor: '#E74C3C',
      success: (res) => {
        if (res.confirm) {
          deleteTable(id);
          Taro.showToast({ title: '删除成功', icon: 'success' });
        }
      }
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入桌台名称', icon: 'none' });
      return;
    }
    if (!tableNo.trim()) {
      Taro.showToast({ title: '请输入桌台编号', icon: 'none' });
      return;
    }
    const rateNum = parseFloat(baseRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      Taro.showToast({ title: '请输入有效的基础费率', icon: 'none' });
      return;
    }

    const tableData = {
      name: name.trim(),
      tableNo: tableNo.trim(),
      type,
      capacity,
      location,
      baseRate: rateNum,
      status
    };

    if (mode === 'edit' && editId) {
      updateTable(editId, tableData);
      Taro.showToast({ title: '修改成功', icon: 'success' });
    } else {
      addTable(tableData);
      Taro.showToast({ title: '创建成功', icon: 'success' });
    }

    setTimeout(() => {
      Taro.navigateBack();
    }, 800);
  };

  const getStatusLabel = (s: TableStatus) => {
    switch (s) {
      case 'free': return '空闲';
      case 'occupied': return '占用';
      case 'reserved': return '预约';
    }
  };

  const renderListMode = () => (
    <>
      <View className={styles.headerBar}>
        <Text className={styles.headerTitle}>桌台建档</Text>
        <Button className={styles.addBtn} onClick={() => Taro.navigateTo({ url: '/pages/table-edit/index?mode=create' })}>
          + 新增桌台
        </Button>
      </View>

      <View className={styles.statsBar}>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>桌台总数</Text>
          <Text className={styles.statsValue}>{stats.total}</Text>
        </View>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>空闲</Text>
          <Text className={classnames(styles.statsValue, styles.statsValueFree)}>{stats.free}</Text>
        </View>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>占用</Text>
          <Text className={classnames(styles.statsValue, styles.statsValueOccupied)}>{stats.occupied}</Text>
        </View>
      </View>

      <View className={styles.filterBar}>
        {FILTERS.map(f => (
          <Button
            key={f.key}
            className={classnames(styles.filterChip, filter === f.key && styles.filterChipActive)}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </View>

      <ScrollView scrollY className={styles.tableList}>
        {filteredTables.length === 0 ? (
          <View className={styles.emptyBox}>
            <EmptyState text='暂无桌台数据，点击右上角新增' />
          </View>
        ) : (
          filteredTables.map((table, idx) => (
            <View key={table.id} className={styles.tableItem}>
              <View className={styles.tableItemHeader}>
                <View className={classnames(styles.tableNoBadge, idx % 2 === 1 && styles.tableNoBadgeAlt)}>
                  {table.tableNo}
                </View>
                <View className={styles.tableInfo}>
                  <Text className={styles.tableName}>{table.name}</Text>
                  <View className={styles.tableMeta}>
                    <Text>{table.type}</Text>
                    <View className={styles.tableMetaSep} />
                    <Text>{table.location}</Text>
                    <View className={styles.tableMetaSep} />
                    <Tag type={table.status}>{getStatusLabel(table.status)}</Tag>
                  </View>
                </View>
              </View>

              <View className={styles.tableDetailGrid}>
                <View className={styles.tableDetailItem}>
                  <Text className={styles.tableDetailLabel}>容纳人数</Text>
                  <Text className={styles.tableDetailValue}>{table.capacity}人</Text>
                </View>
                <View className={styles.tableDetailItem}>
                  <Text className={styles.tableDetailLabel}>基础费率</Text>
                  <Text className={classnames(styles.tableDetailValue, styles.tableDetailValueRate)}>¥{table.baseRate}/h</Text>
                </View>
                <View className={styles.tableDetailItem}>
                  <Text className={styles.tableDetailLabel}>状态</Text>
                  <Text className={styles.tableDetailValue}>{getStatusLabel(table.status)}</Text>
                </View>
              </View>

              <View className={styles.tableActions}>
                <Button
                  className={classnames(styles.actionBtn, styles.actionBtnEdit)}
                  onClick={() => Taro.navigateTo({ url: `/pages/table-edit/index?mode=edit&id=${table.id}` })}
                >
                  ✏️ 编辑
                </Button>
                <Button
                  className={classnames(styles.actionBtn, styles.actionBtnDelete)}
                  onClick={() => handleDelete(table.id, table.name)}
                >
                  🗑️ 删除
                </Button>
              </View>
            </View>
          ))
        )}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </>
  );

  const renderFormMode = () => (
    <>
      <View className={styles.editHeader}>
        <Button className={styles.backBtn} onClick={() => Taro.navigateBack()}>
          ‹
        </Button>
        <Text className={styles.headerTitle}>
          {mode === 'edit' ? '编辑桌台' : '新增桌台'}
        </Text>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>🪑</Text>
          基本信息
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>桌台名称</Text>
          <Input
            className={styles.formInput}
            placeholder='如：1号桌'
            placeholderClass={styles.formPlaceholder as any}
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>桌台编号</Text>
          <Input
            className={styles.formInput}
            placeholder='如：T001'
            placeholderClass={styles.formPlaceholder as any}
            value={tableNo}
            onInput={(e) => setTableNo(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>📋</Text>
          规格配置
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>桌台类型</Text>
          <Text className={styles.formValue}>{type}</Text>
        </View>
        <View className={styles.typeOptions}>
          {TABLE_TYPES.map(t => (
            <Button
              key={t}
              className={classnames(styles.typeOption, type === t && styles.typeOptionActive)}
              onClick={() => setType(t)}
            >
              {t}
            </Button>
          ))}
        </View>

        <View className={styles.formRow} style={{ marginTop: '16rpx' }}>
          <Text className={styles.formLabel}>容纳人数</Text>
          <View className={styles.capacityRow}>
            <Button
              className={styles.capacityBtn}
              onClick={() => setCapacity(Math.max(1, capacity - 1))}
            >
              −
            </Button>
            <Text className={styles.capacityValue}>{capacity}</Text>
            <Button
              className={classnames(styles.capacityBtn, styles.capacityBtnPlus)}
              onClick={() => setCapacity(Math.min(20, capacity + 1))}
            >
              +
            </Button>
          </View>
        </View>

        <View className={styles.formRow}>
          <Text className={styles.formLabel}>所在区域</Text>
          <Text className={styles.formValue}>{location}</Text>
        </View>
        <View className={styles.typeOptions}>
          {LOCATIONS.map(l => (
            <Button
              key={l}
              className={classnames(styles.typeOption, location === l && styles.typeOptionActive)}
              onClick={() => setLocation(l)}
            >
              {l}
            </Button>
          ))}
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>💰</Text>
          计费配置
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>基础时薪</Text>
          <Input
            className={styles.formInput}
            type='digit'
            placeholder='元/小时'
            placeholderClass={styles.formPlaceholder as any}
            value={baseRate}
            onInput={(e) => setBaseRate(e.detail.value)}
          />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>当前状态</Text>
          <Text className={styles.formValue}>{getStatusLabel(status)}</Text>
        </View>
        <View className={styles.typeOptions}>
          {(['free', 'occupied', 'reserved'] as TableStatus[]).map(s => (
            <Button
              key={s}
              className={classnames(styles.typeOption, status === s && styles.typeOptionActive)}
              onClick={() => setStatus(s)}
            >
              {getStatusLabel(s)}
            </Button>
          ))}
        </View>
      </View>

      <View style={{ height: '200rpx' }} />

      <View className={styles.bottomBar}>
        <Button className={styles.cancelBtn} onClick={() => Taro.navigateBack()}>取消</Button>
        <Button className={styles.confirmBtn} onClick={handleSubmit}>
          {mode === 'edit' ? '保存修改' : '确认创建'}
        </Button>
      </View>
    </>
  );

  return (
    <ScrollView scrollY className={styles.page}>
      {mode === 'list' ? renderListMode() : renderFormMode()}
    </ScrollView>
  );
};

export default TableEditPage;
