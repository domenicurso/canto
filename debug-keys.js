#!/usr/bin/env node

// Debug script to capture raw keyboard input sequences
console.log("Keyboard Input Debug Tool");
console.log("Press keys to see their sequences. Ctrl+C to exit.");
console.log("Try: backspace, shift+arrow keys, etc.");
console.log("=" * 50);

// Set up raw mode
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding("binary");

// Listen for data
process.stdin.on("data", (data) => {
  // Convert to buffer for hex analysis
  const buffer = Buffer.from(data, "binary");

  // Check for Ctrl+C (ASCII 3)
  if (buffer.length === 1 && buffer[0] === 3) {
    console.log("\nCtrl+C detected - exiting...");
    cleanup();
    return;
  }

  // Log the sequence
  console.log(`Raw: ${JSON.stringify(data)}`);
  console.log(`Hex: ${buffer.toString("hex")}`);
  console.log(`Bytes: [${Array.from(buffer).join(", ")}]`);

  // Try to identify common sequences
  let description = "Unknown";

  if (buffer.length === 1) {
    const code = buffer[0];
    switch (code) {
      case 8:
        description = "Backspace";
        break;
      case 9:
        description = "Tab";
        break;
      case 13:
        description = "Enter";
        break;
      case 27:
        description = "Escape";
        break;
      default:
        if (code >= 32 && code <= 126) {
          description = `Printable char: '${String.fromCharCode(code)}'`;
        } else if (code < 32) {
          description = `Ctrl+${String.fromCharCode(code + 64)}`;
        }
    }
  } else if (data.startsWith("\x1b[")) {
    if (data === "\x1b[A") description = "Arrow Up";
    else if (data === "\x1b[B") description = "Arrow Down";
    else if (data === "\x1b[C") description = "Arrow Right";
    else if (data === "\x1b[D") description = "Arrow Left";
    else if (data === "\x1b[1;2A") description = "Shift+Arrow Up";
    else if (data === "\x1b[1;2B") description = "Shift+Arrow Down";
    else if (data === "\x1b[1;2C") description = "Shift+Arrow Right";
    else if (data === "\x1b[1;2D") description = "Shift+Arrow Left";
    else if (data === "\x1b[a") description = "Shift+Arrow Up (Alt format)";
    else if (data === "\x1b[b") description = "Shift+Arrow Down (Alt format)";
    else if (data === "\x1b[c") description = "Shift+Arrow Right (Alt format)";
    else if (data === "\x1b[d") description = "Shift+Arrow Left (Alt format)";
    else if (data === "\x1b[3~") description = "Delete";
    else if (data === "\x1b[H") description = "Home";
    else if (data === "\x1b[F") description = "End";
    else description = "Escape sequence";
  }

  console.log(`Description: ${description}`);
  console.log("-".repeat(40));
});

function cleanup() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.exit(0);
}

// Handle process termination
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);