"""Security utilities for path validation and sanitization."""

import os
import re
from typing import Optional
from fastapi import HTTPException


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal and null byte injection.

    Args:
        filename: The filename to sanitize

    Returns:
        Sanitized filename

    Raises:
        HTTPException: If filename is invalid
    """
    if not filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty")

    # Check for null bytes
    if "\x00" in filename:
        raise HTTPException(
            status_code=400, detail="Invalid filename: contains null bytes"
        )

    # Remove path traversal attempts
    filename = os.path.basename(filename)

    # Remove any remaining path separators
    filename = filename.replace("/", "").replace("\\", "")

    # Check for dangerous characters
    dangerous_chars = ["<", ">", ":", '"', "|", "?", "*"]
    for char in dangerous_chars:
        if char in filename:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid filename: contains dangerous character '{char}'",
            )

    # Check if filename is now empty
    if not filename or filename in [".", ".."]:
        raise HTTPException(status_code=400, detail="Invalid filename")

    return filename


def validate_path_within_base(
    path: str, base_path: str, allow_absolute: bool = False
) -> str:
    """
    Validate that a path is within a base directory to prevent path traversal.

    Args:
        path: The path to validate
        base_path: The base directory that must contain the path
        allow_absolute: Whether to allow absolute paths (default: False)

    Returns:
        The validated and normalized path

    Raises:
        HTTPException: If path traversal is detected
    """
    if not path:
        return base_path

    # Check for null bytes
    if "\x00" in path:
        raise HTTPException(status_code=400, detail="Invalid path: contains null bytes")

    # Normalize paths
    base_path = os.path.abspath(os.path.normpath(base_path))

    # Handle the path
    if os.path.isabs(path) and not allow_absolute:
        raise HTTPException(status_code=400, detail="Absolute paths are not allowed")

    # Join with base path if relative
    if not os.path.isabs(path):
        full_path = os.path.normpath(os.path.join(base_path, path))
    else:
        full_path = os.path.normpath(path)

    # Security check: ensure the resolved path is within base_path
    try:
        # Use os.path.commonpath for reliable comparison
        common = os.path.commonpath([base_path, full_path])
        if common != base_path:
            raise HTTPException(
                status_code=400,
                detail="Path traversal detected: path is outside allowed directory",
            )
    except ValueError:
        # Different drives on Windows
        raise HTTPException(status_code=400, detail="Invalid path: cannot resolve path")

    # Additional check using string prefix (defense in depth)
    if not full_path.startswith(base_path):
        raise HTTPException(
            status_code=400,
            detail="Path traversal detected: path is outside allowed directory",
        )

    return full_path


def validate_file_extension(
    filename: str, allowed_extensions: Optional[set] = None
) -> str:
    """
    Validate file extension against allowed list.

    Args:
        filename: The filename to check
        allowed_extensions: Set of allowed extensions (without dots)

    Returns:
        The file extension (lowercase, without dot)

    Raises:
        HTTPException: If extension is not allowed
    """
    if not filename or "." not in filename:
        raise HTTPException(status_code=400, detail="File must have an extension")

    ext = filename.rsplit(".", 1)[-1].lower()

    if allowed_extensions and ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, detail=f"File type '.{ext}' is not allowed"
        )

    # Check for double extensions (e.g., file.exe.txt)
    if filename.count(".") > 1:
        # Get the second-to-last extension
        parts = filename.rsplit(".", 2)
        if len(parts) >= 3:
            second_ext = parts[-2].lower()
            dangerous_extensions = {
                "exe",
                "dll",
                "bat",
                "cmd",
                "sh",
                "bin",
                "app",
                "dmg",
                "pkg",
                "deb",
                "rpm",
                "msi",
                "jar",
                "war",
            }
            if second_ext in dangerous_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Suspicious file: detected potentially executable extension '.{second_ext}'",
                )

    return ext


def validate_mime_type(file_content: bytes, expected_extensions: set) -> bool:
    """
    Basic MIME type validation based on file signatures (magic numbers).

    Args:
        file_content: The file content bytes
        expected_extensions: Set of expected file extensions

    Returns:
        True if MIME type appears valid, False otherwise
    """
    if not file_content:
        return False

    # Common file signatures (magic numbers)
    signatures = {
        "pdf": (b"%PDF",),
        "png": (b"\x89PNG\r\n\x1a\n",),
        "jpg": (b"\xff\xd8\xff",),
        "jpeg": (b"\xff\xd8\xff",),
        "gif": (b"GIF87a", b"GIF89a"),
        "zip": (b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"),
        "docx": (b"PK\x03\x04",),  # Actually a ZIP
        "xlsx": (b"PK\x03\x04",),  # Actually a ZIP
        "pptx": (b"PK\x03\x04",),  # Actually a ZIP
    }

    for ext in expected_extensions:
        if ext in signatures:
            for sig in signatures[ext]:
                if file_content.startswith(sig):
                    return True

    # For text-based files or if no signature check applies, return True
    # (they'll be validated by extension only)
    return True


def sanitize_path_component(component: str) -> str:
    """
    Sanitize a single path component (directory or filename).

    Args:
        component: Path component to sanitize

    Returns:
        Sanitized component
    """
    if not component:
        return ""

    # Remove null bytes
    component = component.replace("\x00", "")

    # Remove path separators
    component = component.replace("/", "").replace("\\", "")

    # Remove dangerous characters but keep dots for extensions
    dangerous = ["<", ">", ":", '"', "|", "?", "*"]
    for char in dangerous:
        component = component.replace(char, "")

    # Remove leading dots (hidden files) for security
    component = component.lstrip(".")

    return component or "unnamed"
