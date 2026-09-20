"""Create and validate a portable mini-tool ZIP using only the standard library."""
from pathlib import Path
import sys
import zipfile


def safe_name(name):
    if "\\" in name or name.startswith("/") or ".." in name or ":" in name:
        raise ValueError(f"Unsafe archive path: {name!r}")
    if any(part in ("", ".") for part in name.split("/")):
        raise ValueError(f"Invalid relative path: {name!r}")


def pack(source, destination):
    source = Path(source).resolve()
    expected = {}
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(source.rglob("*")):
            if not file.is_file():
                continue
            name = file.relative_to(source).as_posix()
            safe_name(name)
            data = file.read_bytes()
            expected[name] = data
            # Explicit POSIX names in both local headers and central directory.
            archive.writestr(name, data)
    with zipfile.ZipFile(destination) as archive:
        names = archive.namelist()
        assert "index.html" in names, "Missing root index.html"
        assert len(names) == len(set(names)) == len(expected), "Duplicate/missing entries"
        for name in names:
            safe_name(name)
            # Reading also checks local-header filenames and CRC, not just the directory.
            assert archive.read(name) == expected[name], f"Content mismatch: {name}"
    print(f"ZIP verified: {len(expected)} files, POSIX paths, root index.html, matching contents")


if __name__ == "__main__":
    pack(sys.argv[1], sys.argv[2])
