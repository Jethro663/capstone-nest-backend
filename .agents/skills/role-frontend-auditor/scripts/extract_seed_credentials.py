#!/usr/bin/env python3
"""Extract normalized role credentials from backend/seed-database.js."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def _extract_constant(source: str, name: str) -> str | None:
    match = re.search(rf"const\s+{re.escape(name)}\s*=\s*'([^']+)';", source)
    return match.group(1) if match else None


def _extract_object_block(source: str, name: str) -> str | None:
    match = re.search(rf"const\s+{re.escape(name)}\s*=\s*\{{(.*?)\n\}};", source, re.DOTALL)
    return match.group(1) if match else None


def _extract_array_block(source: str, name: str) -> str | None:
    match = re.search(rf"const\s+{re.escape(name)}\s*=\s*\[(.*?)\n\];", source, re.DOTALL)
    return match.group(1) if match else None


def _extract_inline_value(block: str, field: str) -> str | None:
    match = re.search(rf"{re.escape(field)}\s*:\s*'([^']+)'", block)
    return match.group(1) if match else None


def _parse_role_entries(block: str, shared_password: str | None) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for object_body in re.findall(r"\{(.*?)\}", block, re.DOTALL):
        email = _extract_inline_value(object_body, "email")
        if not email:
            continue
        password = _extract_inline_value(object_body, "password") or shared_password or ""
        first_name = _extract_inline_value(object_body, "firstName") or ""
        last_name = _extract_inline_value(object_body, "lastName") or ""
        entries.append(
            {
                "email": email,
                "password": password,
                "firstName": first_name,
                "lastName": last_name,
            }
        )
    return entries


def extract_credentials(seed_path: Path) -> dict[str, object]:
    source = seed_path.read_text(encoding="utf-8")

    admin_block = _extract_object_block(source, "ADMIN_USER") or ""
    teacher_password = _extract_constant(source, "DEFAULT_TEACHER_PASSWORD")
    student_password = _extract_constant(source, "DEFAULT_STUDENT_PASSWORD")
    teachers_block = _extract_array_block(source, "TEACHERS") or ""
    students_block = _extract_array_block(source, "STUDENTS") or ""

    admin = {
        "email": _extract_inline_value(admin_block, "email") or "",
        "password": _extract_inline_value(admin_block, "password") or "",
        "firstName": _extract_inline_value(admin_block, "firstName") or "",
        "lastName": _extract_inline_value(admin_block, "lastName") or "",
    }
    teachers = _parse_role_entries(teachers_block, teacher_password)
    students = _parse_role_entries(students_block, student_password)

    return {
        "seedFile": str(seed_path),
        "roles": {
            "admin": {
                "primary": admin,
                "accounts": [admin] if admin["email"] else [],
            },
            "teacher": {
                "primary": teachers[0] if teachers else None,
                "accounts": teachers,
                "sharedPassword": teacher_password,
            },
            "student": {
                "primary": students[0] if students else None,
                "accounts": students,
                "sharedPassword": student_password,
            },
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("seed_file", type=Path, help="Path to backend/seed-database.js")
    parser.add_argument("--role", choices=["admin", "teacher", "student"], help="Emit one role only")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    payload = extract_credentials(args.seed_file)
    if args.role:
        payload = {
            "seedFile": payload["seedFile"],
            "role": args.role,
            "credentials": payload["roles"][args.role],
        }

    print(json.dumps(payload, indent=2 if args.pretty else None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
