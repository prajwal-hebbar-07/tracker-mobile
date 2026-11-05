import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { TodayClock } from '@/components/TodayClock'
import { color } from '@/theme'

export default function WorkScreen() {
  return (
    <Screen>
      <TodayClock />
      <Link href="/apply-leave" asChild>
        <Pressable accessibilityRole="button" style={styles.apply}>
          <Text style={styles.applyText}>Apply leave</Text>
        </Pressable>
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  apply: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.office,
  },
  applyText: { color: color.ink, fontSize: 16, fontWeight: '700' },
})
