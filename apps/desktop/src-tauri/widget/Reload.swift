import WidgetKit

// Linked into the app by build.rs. src/main.rs calls this whenever the log on disk changes, so the desktop widget
// redraws at once instead of at its next scheduled refresh.
@_cdecl("logbook_reload_widgets")
public func logbookReloadWidgets() {
  WidgetCenter.shared.reloadAllTimelines()
}
