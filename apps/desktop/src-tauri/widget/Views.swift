import SwiftUI
import WidgetKit

struct LogEntry: TimelineEntry {
  let date: Date
  let state: LogState
}

// The desktop app's palette (apps/desktop/src/styles.css).
private func rgb(_ hex: UInt32) -> Color {
  Color(red: Double(hex >> 16 & 0xff) / 255, green: Double(hex >> 8 & 0xff) / 255, blue: Double(hex & 0xff) / 255)
}

private enum Palette {
  static let text = rgb(0xf3f1ea)
  static let muted = rgb(0xa29d91)
  static let office = rgb(0xe8a93e)
  static let wfh = rgb(0x7eb8a6)
  static let leave = rgb(0xe2806c)
  static let danger = rgb(0xee7b6b)
  static let background = LinearGradient(colors: [rgb(0x22261f), rgb(0x16140f)], startPoint: .top, endPoint: .bottom)
}

// Same wording as the Today page (apps/desktop/src/pages/Today.tsx).
private struct Status {
  let icon: String
  let tint: Color
  let title: String
  let sub: String

  init(_ state: LogState, today: Day?) {
    guard case .days = state else {
      self.init(icon: "exclamationmark.triangle", tint: Palette.danger, title: "Log not readable", sub: "Open Logbook to check it")
      return
    }
    guard let day = today else {
      self.init(icon: "calendar.badge.exclamationmark", tint: Palette.muted, title: "Not logged yet", sub: "Click to log today")
      return
    }
    switch day.kind {
    case .wfh:
      self.init(icon: "house", tint: Palette.wfh, title: "Working from home", sub: "Counts as a worked day")
    case .leave:
      self.init(icon: "beach.umbrella", tint: Palette.leave, title: leaveLabel(day.leaveType), sub: day.note ?? "On leave today")
    case .office:
      let open = day.inTime != nil && day.outTime == nil
      self.init(
        icon: "building.2",
        tint: Palette.office,
        title: open ? "Clocked in" : day.outTime != nil ? "Clocked out" : "In office",
        sub: open ? "Timer is running" : day.outTime != nil ? "Day complete" : "Not clocked in yet"
      )
    }
  }

  private init(icon: String, tint: Color, title: String, sub: String) {
    self.icon = icon
    self.tint = tint
    self.title = title
    self.sub = sub
  }
}

struct LogWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LogEntry

  var body: some View {
    LogContent(entry: entry, wide: family != .systemSmall)
      .containerBackground(for: .widget) { Palette.background }
  }
}

// The layout without WidgetKit's environment, so it can also be drawn outside a widget.
struct LogContent: View {
  let entry: LogEntry
  let wide: Bool

  var body: some View {
    if wide {
      HStack(alignment: .top, spacing: 16) {
        TodayView(entry: entry)
        Rectangle().fill(Palette.muted.opacity(0.25)).frame(width: 1)
        MonthView(entry: entry)
      }
    } else {
      TodayView(entry: entry)
    }
  }
}

private struct TodayView: View {
  let entry: LogEntry

  var body: some View {
    let today: Day? = if case .days(let days) = entry.state { days[dateKey(entry.date)] } else { nil }
    let status = Status(entry.state, today: today)
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text("Today").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
        Spacer(minLength: 4)
        Text(entry.date, format: .dateTime.weekday(.abbreviated).day().month(.abbreviated))
          .font(.caption).foregroundStyle(Palette.muted)
      }
      Spacer(minLength: 0)
      Image(systemName: status.icon).font(.title2).foregroundStyle(status.tint).widgetAccentable()
      Text(status.title).font(.headline).foregroundStyle(Palette.text).lineLimit(1).minimumScaleFactor(0.75)
      if let today, today.kind == .office {
        Hours(day: today, now: entry.date)
      }
      Text(times(today) ?? status.sub).font(.caption).foregroundStyle(Palette.muted).lineLimit(1)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private func times(_ day: Day?) -> String? {
    guard let inTime = day?.inTime else { return nil }
    return day?.outTime.map { "In \(inTime) · Out \($0)" } ?? "In \(inTime)"
  }
}

// A running day counts up on its own (WidgetKit redraws timer text without reloading the widget).
private struct Hours: View {
  let day: Day
  let now: Date

  var body: some View {
    Group {
      if let inTime = day.inTime, day.outTime == nil, moment(inTime, on: now) <= now {
        Text(moment(inTime, on: now), style: .timer)
      } else if let minutes = minutesBetween(day.inTime, day.outTime) {
        Text(formatMinutes(minutes))
      }
    }
    .font(.title3.weight(.semibold).monospacedDigit())
    .foregroundStyle(Palette.text)
  }
}

private struct MonthView: View {
  let entry: LogEntry

  var body: some View {
    let totals: MonthTotals? = if case .days(let days) = entry.state { monthTotals(days, containing: entry.date) } else { nil }
    VStack(alignment: .leading, spacing: 6) {
      Text(entry.date, format: .dateTime.month(.wide)).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
      Spacer(minLength: 0)
      Row(label: "Office", value: totals.map { "\($0.office)" }, tint: Palette.office)
      Row(label: "Home", value: totals.map { "\($0.wfh)" }, tint: Palette.wfh)
      Row(label: "Leave", value: totals.map { "\($0.leave)" }, tint: Palette.leave)
      Row(label: "Hours", value: totals.map { formatMinutes($0.minutes) }, tint: Palette.text)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

private struct Row: View {
  let label: String
  let value: String?
  let tint: Color

  var body: some View {
    HStack(spacing: 6) {
      Circle().fill(tint).frame(width: 6, height: 6).widgetAccentable()
      Text(label).foregroundStyle(Palette.muted)
      Spacer(minLength: 4)
      Text(value ?? "—").foregroundStyle(Palette.text).monospacedDigit()
    }
    .font(.callout)
  }
}
