#!/usr/bin/env python3
"""
Quick Check Script - Verifies chat placeholder in source code
"""

import os
import sys


def check_placeholder():
    """Check if placeholder exists in Chat.tsx"""

    chat_file = os.path.join("frontend", "src", "pages", "Chat.tsx")

    if not os.path.exists(chat_file):
        print(f"[ERROR] {chat_file} not found!")
        return False

    with open(chat_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Check for placeholder
    if 'placeholder="Ask me anything..."' in content:
        print("[PASS] Placeholder 'Ask me anything...' found in Chat.tsx")

        # Find line number
        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            if 'placeholder="Ask me anything..."' in line:
                print(f"   Location: Line {i}")
                print(f"   Context: {line.strip()}")
                break
        return True
    else:
        print("[FAIL] Placeholder not found in Chat.tsx")
        print("   Searching for any placeholder...")

        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            if "placeholder=" in line:
                print(f"   Found at line {i}: {line.strip()}")
        return False


def check_environment():
    """Check environment configuration"""

    env_file = ".env"

    if not os.path.exists(env_file):
        print("[WARNING] .env file not found!")
        return False

    with open(env_file, "r") as f:
        content = f.read()

    if "NVIDIA_API_KEY=" in content:
        # Check if it's not the placeholder value
        if "your_nvidia_api_key_here" not in content:
            print("[PASS] NVIDIA_API_KEY is configured")
            return True
        else:
            print("[FAIL] NVIDIA_API_KEY is still placeholder value")
            return False
    else:
        print("[FAIL] NVIDIA_API_KEY not found in .env")
        return False


def check_frontend_config():
    """Check frontend configuration"""

    package_json = os.path.join("frontend", "package.json")

    if not os.path.exists(package_json):
        print(f"[ERROR] {package_json} not found!")
        return False

    import json

    with open(package_json, "r") as f:
        data = json.load(f)

    if "scripts" in data and "dev" in data["scripts"]:
        print("[PASS] Frontend package.json configured correctly")
        return True
    else:
        print("[FAIL] Frontend scripts not found in package.json")
        return False


def main():
    print("\n" + "=" * 70)
    print("  NVIDIA NEXUS - QUICK VERIFICATION")
    print("=" * 70 + "\n")

    checks = [
        ("Placeholder in Source", check_placeholder),
        ("Environment Config", check_environment),
        ("Frontend Config", check_frontend_config),
    ]

    results = []
    for name, check_func in checks:
        print(f"\nChecking: {name}")
        print("-" * 70)
        result = check_func()
        results.append(result)

    passed = sum(results)
    total = len(results)

    print("\n" + "=" * 70)
    print(f"  RESULTS: {passed}/{total} PASSED")
    print("=" * 70 + "\n")

    if passed == total:
        print("[SUCCESS] All checks passed!")
        print("\nNext Steps:")
        print("1. Run: start_services.bat (or manually start backend & frontend)")
        print("2. Open Chrome: http://localhost:3000")
        print("3. Navigate to Chat page")
        print("4. Look for the placeholder 'Ask me anything...'")
        print("5. Send a test message!")
    else:
        print("[FAILED] Some checks failed. Please review the errors above.")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
