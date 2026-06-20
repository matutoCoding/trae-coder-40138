import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useStore } from '../../store/useStore';
import Tag from '../../components/Tag';
import EmptyState from '../../components/EmptyState';
import { GameRental } from '../../types';
import { formatDate } from '../../utils/time';

const CATEGORIES = ['社交推理', '策略经营', '家庭休闲', '策略卡牌', '卡牌对战', '角色扮演'];
const DIFFICULTIES = [
  { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '困难' }
];
const CATEGORY_FILTERS = [
  { key: 'all', label: '全部' },
  { key: '社交推理', label: '社交推理' },
  { key: '策略经营', label: '策略经营' },
  { key: '家庭休闲', label: '家庭休闲' },
  { key: '策略卡牌', label: '策略卡牌' },
  { key: '卡牌对战', label: '卡牌对战' },
  { key: '角色扮演', label: '角色扮演' }
];

const GameManagePage: React.FC = () => {
  const router = useRouter();
  const initMode = (router.params.mode as 'list' | 'create' | 'edit') || 'list';
  const editId = router.params.id || '';

  const { games, bills, addGame, updateGame, returnGame, rentGame } = useStore();

  const [viewMode, setViewMode] = useState<'games' | 'rentals'>('games');
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>(initMode);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [players, setPlayers] = useState('2-4人');
  const [totalQty, setTotalQty] = useState(3);
  const [description, setDescription] = useState('');

  const editingGame = useMemo(() => {
    if (formMode === 'edit' && editId) {
      return games.find(g => g.id === editId);
    }
    return null;
  }, [games, formMode, editId]);

  React.useEffect(() => {
    if (editingGame) {
      setName(editingGame.name);
      setCategory(editingGame.category);
      setDifficulty(editingGame.difficulty);
      setPlayers(editingGame.players);
      setTotalQty(editingGame.totalQty);
      setDescription(editingGame.description);
    }
  }, [editingGame]);

  const filteredGames = useMemo(() => {
    return games.filter(g => {
      if (searchText && !g.name.includes(searchText) && !g.category.includes(searchText)) return false;
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      return true;
    });
  }, [games, searchText, categoryFilter]);

  const activeRentals = useMemo(() => {
    const rentals: (GameRental & { playerName: string; tableName: string })[] = [];
    bills.forEach(bill => {
      bill.gameRentals.forEach(r => {
        if (r.status === 'rented') {
          rentals.push({
            ...r,
            playerName: bill.playerName,
            tableName: bill.tableName
          });
        }
      });
    });
    return rentals.sort((a, b) => b.rentedAt - a.rentedAt);
  }, [bills]);

  const stats = useMemo(() => {
    const total = games.reduce((s, g) => s + g.totalQty, 0);
    const available = games.reduce((s, g) => s + g.availableQty, 0);
    const lowStock = games.filter(g => g.availableQty > 0 && g.availableQty <= 1).length;
    const outOfStock = games.filter(g => g.availableQty === 0).length;
    return { total, available, lowStock, outOfStock, rented: total - available };
  }, [games]);

  const getDifficultyLabel = (d: string) => {
    switch (d) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      default: return d;
    }
  };

  const getDifficultyType = (d: string): 'success' | 'warning' | 'error' => {
    switch (d) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'info';
    }
  };

  const getAvailabilityClass = (avail: number, total: number) => {
    const ratio = avail / total;
    if (avail === 0) return styles.gameDetailValueBad;
    if (ratio <= 0.3) return styles.gameDetailValueWarn;
    return styles.gameDetailValueOk;
  };

  const getGameIcon = (cat: string) => {
    const map: Record<string, string> = {
      '社交推理': '🕵️',
      '策略经营': '🏗️',
      '家庭休闲': '👨‍👩‍👧',
      '策略卡牌': '💎',
      '卡牌对战': '⚔️',
      '角色扮演': '🧙'
    };
    return map[cat] || '🎲';
  };

  const handleReturn = (rentalId: string, gameName: string) => {
    Taro.showModal({
      title: '确认归还',
      content: `确定桌游「${gameName}」已归还吗？`,
      confirmColor: '#27AE60',
      success: (res) => {
        if (res.confirm) {
          returnGame(rentalId);
          Taro.showToast({ title: '归还成功', icon: 'success' });
        }
      }
    });
  };

  const handleQuickRent = (gameId: string) => {
    const unpaidBills = bills.filter(b => b.status === 'unpaid');
    if (unpaidBills.length === 0) {
      Taro.showToast({ title: '无进行中的账单', icon: 'none' });
      return;
    }
    const options = unpaidBills.map(b => `${b.tableName} · ${b.playerName}`);
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        const bill = unpaidBills[res.tapIndex];
        rentGame(gameId, bill.id);
        Taro.showToast({ title: '借出成功', icon: 'success' });
      }
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入桌游名称', icon: 'none' });
      return;
    }
    if (totalQty <= 0) {
      Taro.showToast({ title: '总数量必须大于0', icon: 'none' });
      return;
    }

    const currentAvail = editingGame ? editingGame.availableQty : totalQty;
    const gameData = {
      name: name.trim(),
      category,
      difficulty,
      players: players.trim() || '2-4人',
      totalQty,
      availableQty: Math.min(currentAvail, totalQty),
      description: description.trim()
    };

    if (formMode === 'edit' && editId) {
      updateGame(editId, gameData);
      Taro.showToast({ title: '修改成功', icon: 'success' });
    } else {
      addGame(gameData);
      Taro.showToast({ title: '添加成功', icon: 'success' });
    }

    setTimeout(() => {
      setFormMode('list');
    }, 800);
  };

  const renderListMode = () => (
    <>
      <View className={styles.headerBar}>
        <Text className={styles.headerTitle}>桌游管理</Text>
        <Button
          className={styles.addBtn}
          onClick={() => setFormMode('create')}
        >
          + 添加桌游
        </Button>
      </View>

      <View className={styles.statsBar}>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>桌游款式</Text>
          <Text className={styles.statsValue}>{games.length}</Text>
        </View>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>可借总数</Text>
          <Text className={classnames(styles.statsValue)}>{stats.available}/{stats.total}</Text>
        </View>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>库存紧张</Text>
          <Text className={classnames(styles.statsValue, styles.statsValueLow)}>{stats.lowStock}</Text>
        </View>
        <View className={styles.statsItem}>
          <Text className={styles.statsLabel}>已借完</Text>
          <Text className={classnames(styles.statsValue, styles.statsValueOut)}>{stats.outOfStock}</Text>
        </View>
      </View>

      <View className={styles.tabBar}>
        <Button
          className={classnames(styles.tabItem, viewMode === 'games' && styles.tabItemActive)}
          onClick={() => setViewMode('games')}
        >
          🎲 桌游清单
        </Button>
        <Button
          className={classnames(styles.tabItem, viewMode === 'rentals' && styles.tabItemActive)}
          onClick={() => setViewMode('rentals')}
        >
          📋 借还登记 ({activeRentals.length})
        </Button>
      </View>

      {viewMode === 'games' ? (
        <>
          <View className={styles.searchBox}>
            <Text className={styles.searchIcon}>🔍</Text>
            <Input
              className={styles.searchInput}
              placeholder='搜索桌游名称或分类'
              placeholderClass={styles.formPlaceholder as any}
              value={searchText}
              onInput={(e) => setSearchText(e.detail.value)}
            />
          </View>

          <View className={styles.filterBar}>
            {CATEGORY_FILTERS.map(f => (
              <Button
                key={f.key}
                className={classnames(styles.filterChip, categoryFilter === f.key && styles.filterChipActive)}
                onClick={() => setCategoryFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </View>

          <ScrollView scrollY className={styles.gameList}>
            {filteredGames.length === 0 ? (
              <View className={styles.emptyBox}>
                <EmptyState text='暂无桌游，点击右上角添加' />
              </View>
            ) : (
              filteredGames.map(game => (
                <View key={game.id} className={styles.gameItem}>
                  <View className={styles.gameItemHeader}>
                    <View className={styles.gameIconBox}>
                      <Text className={styles.gameIcon}>{getGameIcon(game.category)}</Text>
                    </View>
                    <View className={styles.gameInfo}>
                      <Text className={styles.gameName}>{game.name}</Text>
                      <View className={styles.gameTags}>
                        <Tag type='info'>{game.category}</Tag>
                        <Tag type={getDifficultyType(game.difficulty)}>
                          {getDifficultyLabel(game.difficulty)}
                        </Tag>
                        <Tag type='primary'>{game.players}</Tag>
                      </View>
                      <Text className={styles.gameDesc}>{game.description || '暂无描述'}</Text>
                    </View>
                  </View>

                  <View className={styles.gameDetailGrid}>
                    <View className={styles.gameDetailItem}>
                      <Text className={styles.gameDetailLabel}>总库存</Text>
                      <Text className={styles.gameDetailValue}>{game.totalQty}份</Text>
                    </View>
                    <View className={styles.gameDetailItem}>
                      <Text className={styles.gameDetailLabel}>可借</Text>
                      <Text className={classnames(
                        styles.gameDetailValue,
                        getAvailabilityClass(game.availableQty, game.totalQty)
                      )}>
                        {game.availableQty}份
                      </Text>
                    </View>
                    <View className={styles.gameDetailItem}>
                      <Text className={styles.gameDetailLabel}>已借出</Text>
                      <Text className={styles.gameDetailValue}>
                        {game.totalQty - game.availableQty}份
                      </Text>
                    </View>
                  </View>

                  <View className={styles.gameActions}>
                    <Button
                      className={classnames(
                        styles.actionBtn,
                        styles.actionBtnRent,
                        game.availableQty === 0 && styles.actionBtnDisabled
                      )}
                      onClick={() => game.availableQty > 0 && handleQuickRent(game.id)}
                    >
                      {game.availableQty > 0 ? '📤 借出' : '已借完'}
                    </Button>
                    <Button
                      className={classnames(styles.actionBtn, styles.actionBtnEdit)}
                      onClick={() => {
                        Taro.redirectTo({ url: `/pages/game-manage/index?mode=edit&id=${game.id}` });
                      }}
                    >
                      ✏️ 编辑
                    </Button>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: '40rpx' }} />
          </ScrollView>
        </>
      ) : (
        <ScrollView scrollY className={styles.rentalList}>
          {activeRentals.length === 0 ? (
            <View className={styles.emptyBox}>
              <EmptyState text='暂无借出中的桌游' />
            </View>
          ) : (
            activeRentals.map(rental => (
              <View key={rental.id} className={styles.rentalItem}>
                <View className={styles.rentalHeader}>
                  <View className={styles.rentalInfo}>
                    <Text className={styles.rentalGame}>🎲 {rental.gameName}</Text>
                    <Text className={styles.rentalMeta}>
                      {rental.tableName} · {rental.playerName}
                    </Text>
                  </View>
                  <View className={styles.rentalTime}>
                    借出时间
                    <Text className={styles.rentalTimeValue}>
                      {formatDate(rental.rentedAt, 'HH:mm')}
                    </Text>
                  </View>
                </View>
                <View className={styles.rentalActions}>
                  <Button
                    className={styles.rentalReturnBtn}
                    onClick={() => handleReturn(rental.id, rental.gameName)}
                  >
                    ✅ 确认归还
                  </Button>
                </View>
              </View>
            ))
          )}
          <View style={{ height: '40rpx' }} />
        </ScrollView>
      )}
    </>
  );

  const renderFormMode = () => (
    <>
      <View className={styles.editHeader}>
        <Button
          className={styles.backBtn}
          onClick={() => {
            if (formMode === 'edit') {
              Taro.redirectTo({ url: '/pages/game-manage/index?mode=list' });
            } else {
              setFormMode('list');
            }
          }}
        >
          ‹
        </Button>
        <Text className={styles.headerTitle}>
          {formMode === 'edit' ? '编辑桌游' : '添加桌游'}
        </Text>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>🎲</Text>
          基本信息
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>桌游名称</Text>
          <Input
            className={styles.formInput}
            placeholder='如：狼人杀'
            placeholderClass={styles.formPlaceholder as any}
            value={name}
            onInput={(e) => setName(e.detail.value)}
          />
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>适合人数</Text>
          <Input
            className={styles.formInput}
            placeholder='如：2-4人'
            placeholderClass={styles.formPlaceholder as any}
            value={players}
            onInput={(e) => setPlayers(e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>📋</Text>
          分类属性
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>游戏分类</Text>
          <Text className={styles.formValue}>{category}</Text>
        </View>
        <View className={styles.typeOptions}>
          {CATEGORIES.map(c => (
            <Button
              key={c}
              className={classnames(styles.typeOption, category === c && styles.typeOptionActive)}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </View>

        <View className={styles.formRow} style={{ marginTop: '16rpx' }}>
          <Text className={styles.formLabel}>难度等级</Text>
          <Text className={styles.formValue}>{getDifficultyLabel(difficulty)}</Text>
        </View>
        <View className={styles.typeOptions}>
          {DIFFICULTIES.map(d => (
            <Button
              key={d.key}
              className={classnames(styles.typeOption, difficulty === d.key && styles.typeOptionActive)}
              onClick={() => setDifficulty(d.key as any)}
            >
              {d.label}
            </Button>
          ))}
        </View>
      </View>

      <View className={styles.formCard}>
        <Text className={styles.formSectionTitle}>
          <Text className={styles.formSectionIcon}>📦</Text>
          库存配置
        </Text>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>总数量</Text>
          <View className={styles.qtyRow}>
            <Button
              className={styles.qtyBtn}
              onClick={() => setTotalQty(Math.max(1, totalQty - 1))}
            >
              −
            </Button>
            <Text className={styles.qtyValue}>{totalQty}</Text>
            <Button
              className={classnames(styles.qtyBtn, styles.qtyBtnPlus)}
              onClick={() => setTotalQty(Math.min(99, totalQty + 1))}
            >
              +
            </Button>
          </View>
        </View>
        <View className={styles.formRow}>
          <Text className={styles.formLabel}>游戏描述</Text>
          <Input
            className={styles.formInput}
            placeholder='简短介绍'
            placeholderClass={styles.formPlaceholder as any}
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
          />
        </View>
      </View>

      <View style={{ height: '200rpx' }} />

      <View className={styles.bottomBar}>
        <Button
          className={styles.cancelBtn}
          onClick={() => {
            if (formMode === 'edit') {
              Taro.redirectTo({ url: '/pages/game-manage/index?mode=list' });
            } else {
              setFormMode('list');
            }
          }}
        >
          取消
        </Button>
        <Button className={styles.confirmBtn} onClick={handleSubmit}>
          {formMode === 'edit' ? '保存修改' : '确认添加'}
        </Button>
      </View>
    </>
  );

  return (
    <ScrollView scrollY className={styles.page}>
      {formMode === 'list' ? renderListMode() : renderFormMode()}
    </ScrollView>
  );
};

export default GameManagePage;
