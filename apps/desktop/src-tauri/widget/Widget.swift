import SwiftUI
import WidgetKit

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> LogEntry {
    LogEntry(date: Date(), state: .days([:]))
  }

  func getSnapshot(in context: Context, completion: @escaping (LogEntry) -> Void) {
    completion(LogEntry(date: Date(), state: readLog()))
  }

  // The app asks for a redraw whenever the log changes (src/main.rs). The scheduled refresh covers CLI edits made
  // while the app is closed, and the extra entry turns the widget over to the new day at midnight.
  func getTimeline(in context: Context, completion: @escaping (Timeline<LogEntry>) -> Void) {
    let now = Date()
    let state = readLog()
    let calendar = Calendar.current
    let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now
    let refresh = min(midnight, now.addingTimeInterval(30 * 60))
    let entries = [LogEntry(date: now, state: state), LogEntry(date: midnight, state: state)]
    completion(Timeline(entries: entries, policy: .after(refresh)))
  }
}

@main
struct LogbookWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "works.oni.logbook.widget.today", provider: Provider()) { entry in
      LogWidgetView(entry: entry)
    }
    .configurationDisplayName("Logbook")
    .description("Today's attendance and this month's totals.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
