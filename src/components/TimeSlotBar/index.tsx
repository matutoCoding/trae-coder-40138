import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import styles from './index.module.scss';
import { Occupancy } from '../../types';
import { formatTime, todayStart, addHours, getHoursDiff } from '../../utils/time';

export interface TimeSlotBarProps {
  occupancies: Occupancy[];
  tableName?: string;
  onSlotClick?: (occ: Occupancy) => void;
}

const HOURS_IN_DAY = 24;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 24;
const VISIBLE_HOURS = DAY_END_HOUR - DAY_START_HOUR;

const TimeSlotBar: React.FC<TimeSlotBarProps> = ({ occupancies, tableName, onSlotClick }) => {
  const dayStart = todayStart();
  const now = Date.now();

  const slots = occupancies.filter(o => o.status !== 'cancelled');

  const timeLabels = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 2) {
    timeLabels.push({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      percent: ((h - DAY_START_HOUR) / VISIBLE_HOURS) * 100
    });
  }

  const nowPercent = (() => {
    const todayDayStart = todayStart();
    const elapsed = now - todayDayStart;
    const hoursElapsed = elapsed / (1000 * 60 * 60);
    if (hoursElapsed < DAY_START_HOUR) return 0;
    if (hoursElapsed > DAY_END_HOUR) return 100;
    return ((hoursElapsed - DAY_START_HOUR) / VISIBLE_HOURS) * 100;
  })();

  return (
    <View className={styles.wrapper}>
      {tableName && (
        <View className={styles.tableHeader}>
          <Text className={styles.tableLabel}>{tableName}</Text>
        </View>
      )}
      <View className={styles.barContainer}>
        <View className={styles.timeAxis}>
          {timeLabels.map(tl => (
            <View
              key={tl.hour}
              className={styles.timeTick}
              style={{ left: `${tl.percent}%` }}
            >
              <View className={styles.timeTickLine} />
              <Text className={styles.timeTickLabel}>{tl.label}</Text>
            </View>
          ))}
        </View>

        <View className={styles.slotTrack}>
          {slots.map(slot => {
            const startHour = (slot.startAt - dayStart) / (1000 * 60 * 60);
            const endHour = (slot.endAt - dayStart) / (1000 * 60 * 60);
            const left = Math.max(0, ((startHour - DAY_START_HOUR) / VISIBLE_HOURS) * 100);
            const right = Math.min(100, ((endHour - DAY_START_HOUR) / VISIBLE_HOURS) * 100);
            const width = right - left;

            const isActive = slot.status === 'active' && slot.startAt <= now && slot.endAt >= now;
            const isPast = slot.endAt < now || slot.status === 'completed';

            return (
              <View
                key={slot.id}
                className={`${styles.slotBlock} ${isActive ? styles.slotActive : ''} ${isPast ? styles.slotPast : ''}`}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 2)}%`
                }}
                onClick={() => onSlotClick?.(slot)}
              >
                {width > 8 && (
                  <>
                    <Text className={styles.slotPlayer}>{slot.playerName}</Text>
                    {width > 15 && (
                      <Text className={styles.slotTime}>
                        {formatTime(slot.startAt)}-{formatTime(slot.endAt)}
                      </Text>
                    )}
                  </>
                )}
              </View>
            );
          })}

          {nowPercent > 0 && nowPercent < 100 && (
            <View className={styles.nowMarker} style={{ left: `${nowPercent}%` }}>
              <View className={styles.nowLine} />
              <View className={styles.nowDot} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default TimeSlotBar;
