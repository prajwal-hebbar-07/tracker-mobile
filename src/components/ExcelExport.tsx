import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button, Chip, IconButton, text } from '@/components/ui'
import { excelFileName, excelLabel, excelSheets, maxExcelYears, plural, todayKey, type ExcelOptions } from '@/logic'
import { useDays } from '@/store'
import { color } from '@/theme'
import { toXlsx, xlsxMime } from '@/xlsx'

// Pick a first year and how many years follow it; each day of those years becomes one row.
export function ExcelExport({ year }: { year: number }) {
  const { days } = useDays()
  const [options, setOptions] = useState<ExcelOptions>({ from: year, years: 1, weekends: true, split: true })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const update = (patch: Partial<ExcelOptions>) => setOptions({ ...options, ...patch })
  const sheets = useMemo(() => excelSheets(days, options, todayKey()), [days, options])
  const rows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0)

  async function share() {
    setBusy(true)
    setMessage('')
    try {
      const file = new File(Paths.cache, excelFileName(options))
      file.create({ overwrite: true })
      await file.write(toXlsx(sheets))
      await Sharing.shareAsync(file.uri, {
        mimeType: xlsxMime,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
        dialogTitle: `Logbook ${excelLabel(options)}`,
      })
    } catch {
      setMessage('Could not create the Excel file. Nothing was changed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.box}>
      <Stepper
        label="From"
        value={String(options.from)}
        noun="first year"
        onPrev={() => update({ from: options.from - 1 })}
        onNext={() => update({ from: options.from + 1 })}
      />
      <Stepper
        label="Years"
        value={String(options.years)}
        noun="number of years"
        icons={['minus', 'plus']}
        onPrev={options.years > 1 ? () => update({ years: options.years - 1 }) : undefined}
        onNext={options.years < maxExcelYears ? () => update({ years: options.years + 1 }) : undefined}
      />
      <View style={styles.chips}>
        <Chip
          label="Weekends"
          icon={options.weekends ? 'checkbox-marked' : 'checkbox-blank-outline'}
          selected={options.weekends}
          onPress={() => update({ weekends: !options.weekends })}
        />
        {options.years > 1 ? (
          <>
            <Chip label="Sheet per year" selected={options.split} onPress={() => update({ split: true })} />
            <Chip label="One sheet" selected={!options.split} onPress={() => update({ split: false })} />
          </>
        ) : null}
      </View>
      <Text style={text.faint}>
        {excelLabel(options)} · {plural(rows, 'row')}, one per day · {plural(sheets.length, 'sheet')}
      </Text>
      <Button
        label={busy ? 'Preparing…' : 'Share as Excel (.xlsx)'}
        icon="microsoft-excel"
        variant="primary"
        disabled={busy}
        onPress={share}
      />
      {message ? <Text style={text.danger}>{message}</Text> : null}
    </View>
  )
}

function Stepper({
  label,
  value,
  noun,
  icons = ['chevron-left', 'chevron-right'],
  onPrev,
  onNext,
}: {
  label: string
  value: string
  noun: string
  icons?: ['chevron-left' | 'minus', 'chevron-right' | 'plus']
  onPrev?: () => void
  onNext?: () => void
}) {
  return (
    <View style={styles.stepper}>
      <Text style={text.body}>{label}</Text>
      <View style={styles.controls}>
        <IconButton
          icon={icons[0]}
          label={`Decrease ${noun}`}
          tint={color.office}
          disabled={!onPrev}
          onPress={() => onPrev?.()}
        />
        <Text accessibilityLabel={`${label} ${value}`} style={styles.value}>
          {value}
        </Text>
        <IconButton
          icon={icons[1]}
          label={`Increase ${noun}`}
          tint={color.office}
          disabled={!onNext}
          onPress={() => onNext?.()}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center' },
  value: {
    minWidth: 56,
    color: color.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
