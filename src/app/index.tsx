import { LeaveApply } from '@/components/LeaveApply'
import { Screen } from '@/components/Screen'
import { TodayClock } from '@/components/TodayClock'

export default function WorkScreen() {
  return (
    <Screen>
      <TodayClock />
      <LeaveApply />
    </Screen>
  )
}
