import { useLocalSearchParams } from 'expo-router'
import { LeaveApply } from '@/components/LeaveApply'
import { isDateKey, todayKey } from '@/logic'

export default function ApplyLeaveScreen() {
  const params = useLocalSearchParams<{ from?: string }>()
  const start = typeof params.from === 'string' && isDateKey(params.from) ? params.from : todayKey()
  return <LeaveApply start={start} />
}
