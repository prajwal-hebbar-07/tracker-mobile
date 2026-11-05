import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatMonth, monthCells, todayKey, tone, type Days } from '@/logic'
import { color, inkFor, toneColor } from '@/theme'

const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MonthHeat({
  year,
  month,
  days,
  selected,
  span,
  titled = false,
  onPick,
}: {
  year: number
  month: number
  days: Days
  selected?: string
  span?: { from: string; to: string }
  titled?: boolean
  onPick?: (date: string) => void
}) {
  const today = todayKey()
  const cells = monthCells(year, month)
  const spanStart = span ? (span.from <= span.to ? span.from : span.to) : ''
  const spanEnd = span ? (span.from <= span.to ? span.to : span.from) : ''
  return (
    <View style={styles.wrap}>
      {titled ? <Text style={styles.title}>{formatMonth(year, month)}</Text> : null}
      <View style={styles.row}>
        {dow.map((label, index) => (
          <Text key={`${label}${index}`} style={styles.dow}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((key, index) => {
          if (!key) return <View key={`empty-${index}`} style={styles.cell} />
          const name = tone(days[key] ?? null)
          const selectedDay = key === selected
          const inSpan = Boolean(spanStart && key >= spanStart && key <= spanEnd)
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${key}, ${name === 'none' ? 'empty' : name}`}
              onPress={() => onPick?.(key)}
              style={styles.cell}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: toneColor[name] },
                  inSpan && styles.span,
                  selectedDay && styles.selected,
                  key === today && !selectedDay && styles.today,
                ]}
              >
                <Text style={[styles.num, { color: inkFor(name) }]}>{Number(key.slice(8))}</Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { color: color.text, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row' },
  dow: { width: '14.28%', textAlign: 'center', color: color.faint, fontSize: 11, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  swatch: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  span: { borderWidth: 2, borderColor: color.text },
  selected: { borderWidth: 2, borderColor: color.text },
  today: { borderWidth: 1, borderColor: color.office },
  num: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
})
