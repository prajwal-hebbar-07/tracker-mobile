import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DayEditor } from '@/components/DayEditor'
import { MonthHeat } from '@/components/MonthHeat'
import { Screen } from '@/components/Screen'
import { formatMonth, isDateKey, parseDateKey, todayKey } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'

export default function LogScreen() {
  const params = useLocalSearchParams<{ date?: string }>()
  const paramDate = typeof params.date === 'string' && isDateKey(params.date) ? params.date : ''
  return <LogBody key={paramDate || 'today'} opening={paramDate} />
}

function LogBody({ opening }: { opening: string }) {
  const today = todayKey()
  const start = parseDateKey(opening || today)
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [selected, setSelected] = useState(opening || today)
  const { days, generation, setDay } = useDays()

  function shift(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <Screen>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{formatMonth(cursor.year, cursor.month)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <MonthHeat
        year={cursor.year}
        month={cursor.month}
        days={days}
        selected={selected}
        onPick={setSelected}
      />
      <DayEditor
        key={`${selected}:${generation}`}
        date={selected}
        day={days[selected]}
        onChange={(day) => setDay(selected, day)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { color: color.text, fontSize: 18, fontWeight: '600' },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: color.office, fontSize: 28, lineHeight: 32 },
})
