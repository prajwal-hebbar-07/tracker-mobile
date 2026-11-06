use std::{env, path::PathBuf, process::Command};

fn main() {
    reload_bridge();
    tauri_build::build()
}

// Compiles widget/Reload.swift into a static library so src/main.rs can ask WidgetKit to redraw the desktop widget.
// Built per target, so a universal release links the right slice into each half.
fn reload_bridge() {
    let source = "widget/Reload.swift";
    println!("cargo:rerun-if-changed={source}");
    println!("cargo:rerun-if-changed=tauri.conf.json");

    let conf: serde_json::Value = serde_json::from_str(&std::fs::read_to_string("tauri.conf.json").unwrap()).unwrap();
    let min = conf["bundle"]["macOS"]["minimumSystemVersion"].as_str().expect("bundle.macOS.minimumSystemVersion");
    let arch = match env::var("CARGO_CFG_TARGET_ARCH").unwrap().as_str() {
        "aarch64" => "arm64".to_string(),
        other => other.to_string(),
    };
    let sdk = run("xcrun", &["--sdk", "macosx", "--show-sdk-path"]);
    let swiftc = PathBuf::from(run("xcrun", &["--find", "swiftc"]));
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());

    let status = Command::new(&swiftc)
        .args(["-O", "-parse-as-library", "-emit-library", "-static", "-swift-version", "5"])
        .args(["-module-name", "LogbookReload", "-target", &format!("{arch}-apple-macos{min}"), "-sdk", &sdk])
        .arg(source)
        .arg("-o")
        .arg(out.join("liblogbook_reload.a"))
        .status()
        .expect("swiftc could not be started; install the Xcode Command Line Tools");
    assert!(status.success(), "swiftc failed on {source}");

    // The library asks for the Swift runtime (in macOS, linked through the SDK's stubs) and the toolchain's
    // back-deployment shims by name; these are where the linker finds them.
    println!("cargo:rustc-link-search=native={}", out.display());
    println!("cargo:rustc-link-lib=static=logbook_reload");
    println!("cargo:rustc-link-search=native={sdk}/usr/lib/swift");
    let toolchain = swiftc.parent().and_then(|bin| bin.parent()).expect("toolchain folder");
    println!("cargo:rustc-link-search=native={}", toolchain.join("lib/swift/macosx").display());
    println!("cargo:rustc-link-lib=framework=WidgetKit");
}

fn run(program: &str, args: &[&str]) -> String {
    let output = Command::new(program).args(args).output().unwrap_or_else(|e| panic!("{program}: {e}"));
    assert!(output.status.success(), "{program} {args:?} failed");
    String::from_utf8(output.stdout).unwrap().trim().to_string()
}
