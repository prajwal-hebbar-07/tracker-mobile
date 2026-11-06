import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatLong, monthCells, todayKey, tone, type Days, type Tone } from '@logbook/core'
import { color, inkFor, toneColor } from '@/theme'

const dow = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const toneWords: Record<Tone, string> = {
  none: 'nothing recorded',
  wfh: 'work from home',
  leave: 'leave',
  office: 'office',
  'office-open': 'office, clock times incomplete',
}

export function MonthHeat({
  year,
  month,
  days,
  span,
  onPick,
}: {
  year: number
  month: number
  days: Days
  span?: { from: string; to: string }
  onPick?: (date: string) => void
}) {
  const today = todayKey()
  const cells = monthCells(year, month)
  const spanStart = span ? (span.from <= span.to ? span.from : span.to) : ''
  const spanEnd = span ? (span.from <= span.to ? span.to : span.from) : ''
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {dow.map((label, index) => (
          <Text key={`${label}${index}`} style={[styles.dow, index >= 5 && styles.dowWeekend]}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((key, index) => {
          if (!key) return <View key={`empty-${index}`} style={styles.cell} />
          const name = tone(days[key] ?? null)
          const inSpan = Boolean(spanStart && key >= spanStart && key <= spanEnd)
          const future = key > today
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: inSpan }}
              accessibilityLabel={`${formatLong(key)}, ${toneWords[name]}`}
              onPress={() => onPick?.(key)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: toneColor[name] },
                  future && name === 'none' && styles.future,
                  inSpan && styles.span,
                  key === today && styles.today,
                ]}
              >
                <Text
                  style={[
                    styles.num,
                    { color: inkFor(name) },
                    name === 'none' && index % 7 >= 5 && styles.numWeekend,
                    key === today && name === 'none' && styles.numToday,
                    inSpan && styles.numSpan,
                  ]}
                >
                  {Number(key.slice(8))}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function Legend() {
  const items = [
    ['Office', toneColor.office],
    ['Home', toneColor.wfh],
    ['Leave', toneColor.leave],
  ] as const
  return (
    <View style={styles.legend}>
      {items.map(([label, swatch]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: swatch }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row' },
  dow: { width: '14.28%', textAlign: 'center', color: color.muted, fontSize: 12, fontWeight: '700' },
  dowWeekend: { color: color.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, padding: 3 },
  swatch: {
    flex: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  future: { backgroundColor: 'transparent' },
  span: { borderColor: color.leave, backgroundColor: color.leaveSoft, borderWidth: 2 },
  today: { borderColor: color.office },
  num: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  numWeekend: { color: color.faint },
  numToday: { color: color.office },
  numSpan: { color: color.text },
  legend: { flexDirection: 'row', justifyContent: 'center', columnGap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 4 },
  legendText: { color: color.muted, fontSize: 12 },
})
