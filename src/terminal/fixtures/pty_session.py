"""Drive the real process terminal through a POSIX PTY; consumed by process.test.ts."""
import base64
import fcntl
import json
import os
import pty
import re
import select
import signal
import struct
import subprocess
import sys
import termios
import time


class Session:
    def __init__(self, bun: str, mode: str, cell: tuple[int, int]) -> None:
        self.master, slave = pty.openpty()
        self.rows, self.cols = 24, 80
        self.cell = cell
        self.queries: set[int] = set()
        self.output = bytearray()
        self.chunks: list[dict[str, int | str]] = []
        self.size(slave)
        self.process = subprocess.Popen(
            [bun, "src/terminal/fixtures/interactive.ts", mode],
            stdin=slave, stdout=slave, stderr=slave, start_new_session=True,
        )
        os.close(slave)

    def size(self, fd: int) -> None:
        width, height = self.cell
        fcntl.ioctl(fd, termios.TIOCSWINSZ,
                    struct.pack("HHHH", self.rows, self.cols,
                                self.cols * width, self.rows * height))

    def respond(self) -> None:
        width, height = self.cell
        replies = {
            b"6n": b"\x1b[1;1R",
            b"16t": f"\x1b[6;{height};{width}t".encode(),
            b"14t": f"\x1b[4;{self.rows * height};{self.cols * width}t".encode(),
        }
        for match in re.finditer(rb"\x1b\[(6n|16t|14t)", self.output):
            if match.start() not in self.queries:
                self.queries.add(match.start())
                os.write(self.master, replies[match.group(1)])

    def collect(self, duration: float = 0.10) -> None:
        start = len(self.output)
        deadline = time.monotonic() + duration
        while time.monotonic() < deadline:
            ready = select.select([self.master], [], [],
                                  max(0, deadline - time.monotonic()))[0]
            if not ready:
                continue
            try:
                chunk = os.read(self.master, 65536)
            except OSError:
                break
            if not chunk:
                break
            self.output.extend(chunk)
            self.respond()
        self.chunks.append({
            "width": self.cols, "height": self.rows,
            "output": base64.b64encode(self.output[start:]).decode(),
        })

    def send(self, data: bytes) -> None:
        os.write(self.master, data)
        self.collect()

    def resize(self, cols: int, rows: int) -> None:
        self.cols, self.rows = cols, rows
        self.size(self.master)
        os.kill(self.process.pid, signal.SIGWINCH)
        self.collect()

    def close(self) -> None:
        if self.process.poll() is None:
            self.process.kill()
        self.process.wait()
        os.close(self.master)


def run() -> None:
    session = Session(sys.argv[1], sys.argv[2], (int(sys.argv[3]), int(sys.argv[4])))
    try:
        session.collect(0.25)
        session.send((b"\x1b[<65;2;3M\x1b[<67;2;3M") * 3)
        session.send(b"\x1b[<0;20;2M\x1b[<32;25;100M\x1b[<0;25;100m")
        session.send(b"\x1b[<0;1;1M\x1b[<32;6;1M\x1b[<0;6;1m\x1bw")
        session.resize(12, 4)
        session.resize(80, 24)
        session.send(b"\x1bOQ")
        session.send(b"\x1bOQ")
        session.send(b"\x03")
        code = session.process.wait(timeout=3)
        if code != 0:
            raise RuntimeError(f"terminal child exited {code}: {bytes(session.output[-2000:])!r}")
        print(json.dumps(session.chunks))
    finally:
        session.close()


if __name__ == "__main__":
    run()
