import Foundation

// The few rules from @logbook/core the desktop widget needs. WidgetKit only runs Swift, so it cannot use the
// TypeScript package: keep these in step with packages/core/src/logic.ts (cleanDay, normalizeTime,
// minutesBetween, leaveLabel, summarize).

enum Kind: String {
  case office, wfh, leave, holiday
}

struct Day: Equatable {
  var kind: Kind
  var inTime: String?
  var outTime: String?
  var leaveType: String?
  var note: String?
}

typealias Days = [String: Day]

struct MonthTotals: Equatable {
  var office = 0
  var wfh = 0
  var leave = 0
  var minutes = 0
}

enum LogState: Equatable {
  case days(Days)
  // The file exists but is not a log, or it could not be opened. The widget says so instead of showing an empty day.
  case unreadable
}

// The same file the Tauri app and the `logbook` CLI use. The extension is sandboxed, so NSHomeDirectory() is its
// container; the real home comes from the user record, and the entitlements allow reading this one folder.
func logURL() -> URL {
  let home = getpwuid(getuid()).flatMap { String(validatingCString: $0.pointee.pw_dir) } ?? NSHomeDirectory()
  return URL(fileURLWithPath: home)
    .appendingPathComponent("Library/Application Support/works.oni.logbook.widget/days.json")
}

func readLog(at url: URL = logURL()) -> LogState {
  let data: Data
  do {
    data = try Data(contentsOf: url)
  } catch let error as CocoaError where error.code == .fileReadNoSuchFile {
    return .days([:])
  } catch {
    return .unreadable
  }
  guard let days = cleanDays(try? JSONSerialization.jsonObject(with: data)) else { return .unreadable }
  return .days(days)
}

// null in core means "not a log"; bad days inside a log are skipped.
func cleanDays(_ value: Any?) -> Days? {
  guard let record = value as? [String: Any] else { return nil }
  var days: Days = [:]
  for (date, raw) in record where isDateKey(date) {
    if let day = cleanDay(raw) { days[date] = day }
  }
  return days
}

func cleanDay(_ value: Any?) -> Day? {
  guard let record = value as? [String: Any],
    let kind = (record["kind"] as? String).flatMap(Kind.init(rawValue:))
  else { return nil }
  var day = Day(kind: kind)
  day.inTime = normalizeTime(record["in"] as? String)
  day.outTime = normalizeTime(record["out"] as? String)
  if let note = (record["note"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !note.isEmpty {
    day.note = String(note.prefix(280))
  }
  if kind == .leave, let type = record["leaveType"] as? String, leaveLabels[type] != nil {
    day.leaveType = type
  }
  return day
}

private func digits(_ text: Substring) -> Int? {
  guard !text.isEmpty, text.allSatisfy({ ("0"..."9").contains($0) }) else { return nil }
  return Int(text)
}

func isDateKey(_ value: String) -> Bool {
  let parts = value.split(separator: "-", omittingEmptySubsequences: false)
  guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
    let year = digits(parts[0]), let month = digits(parts[1]), let day = digits(parts[2]),
    let date = Calendar.current.date(from: DateComponents(year: year, month: month, day: day))
  else { return false }
  return dateKey(date) == value
}

func dateKey(_ date: Date) -> String {
  let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
  return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
}

// "9:05" becomes "09:05"; anything that is not a clock time is dropped.
func normalizeTime(_ value: String?) -> String? {
  guard let parts = value?.trimmingCharacters(in: .whitespaces).split(separator: ":", omittingEmptySubsequences: false),
    parts.count == 2, (1...2).contains(parts[0].count), parts[1].count == 2,
    let hours = digits(parts[0]), let minutes = digits(parts[1]), hours <= 23, minutes <= 59
  else { return nil }
  return String(format: "%02d:%02d", hours, minutes)
}

func clockMinutes(_ time: String) -> Int {
  let parts = time.split(separator: ":")
  return (Int(parts[0]) ?? 0) * 60 + (Int(parts[1]) ?? 0)
}

func minutesBetween(_ inTime: String?, _ outTime: String?) -> Int? {
  guard let inTime, let outTime else { return nil }
  let delta = clockMinutes(outTime) - clockMinutes(inTime)
  return delta < 0 ? nil : delta
}

// When an "HH:MM" time falls on the day of `date`.
func moment(_ time: String, on date: Date) -> Date {
  Calendar.current.startOfDay(for: date).addingTimeInterval(TimeInterval(clockMinutes(time) * 60))
}

func formatMinutes(_ minutes: Int) -> String {
  String(format: "%dh %02dm", minutes / 60, minutes % 60)
}

let leaveLabels = [
  "personal": "Personal leave",
  "early": "Early leave",
  "sick": "Sick leave",
  "lop": "Loss of pay",
]

func leaveLabel(_ type: String?) -> String {
  type.flatMap { leaveLabels[$0] } ?? "Leave"
}

// summarize() for one month, limited to what the widget shows.
func monthTotals(_ days: Days, containing date: Date) -> MonthTotals {
  let prefix = String(dateKey(date).prefix(8))
  var totals = MonthTotals()
  for (key, day) in days where key.hasPrefix(prefix) {
    switch day.kind {
    case .wfh: totals.wfh += 1
    case .leave: totals.leave += 1
    case .holiday: break
    case .office:
      totals.office += 1
      totals.minutes += minutesBetween(day.inTime, day.outTime) ?? 0
    }
  }
  return totals
}
