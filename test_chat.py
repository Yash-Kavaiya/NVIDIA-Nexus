#!/usr/bin/env python3
"""
NVIDIA Nexus - Chat Placeholder End-to-End Test Script
This script verifies that the chat interface is properly configured and working.
"""

import time
import requests
import json
from typing import Dict, Any


class ChatTester:
    def __init__(self, backend_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.api_url = f"{backend_url}/api"
        self.results = []

    def log(self, status: str, test: str, message: str):
        """Log test results"""
        symbol = "✓" if status == "PASS" else "✗"
        color = "\033[92m" if status == "PASS" else "\033[91m"
        reset = "\033[0m"
        print(f"{color}{symbol}{reset} {test}: {message}")
        self.results.append({"status": status, "test": test, "message": message})

    def test_backend_health(self) -> bool:
        """Test 1: Backend Health Check"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                self.log("PASS", "Backend Health", "Backend is running and healthy")
                return True
            else:
                self.log(
                    "FAIL",
                    "Backend Health",
                    f"Unexpected status code: {response.status_code}",
                )
                return False
        except requests.exceptions.RequestException as e:
            self.log("FAIL", "Backend Health", f"Backend not accessible: {str(e)}")
            return False

    def test_backend_info(self) -> bool:
        """Test 2: Backend Info"""
        try:
            response = requests.get(self.backend_url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                app_name = data.get("name", "Unknown")
                version = data.get("version", "Unknown")
                model = data.get("ai_model", "Unknown")
                self.log("PASS", "Backend Info", f"{app_name} v{version} using {model}")
                return True
            else:
                self.log("FAIL", "Backend Info", "Could not retrieve backend info")
                return False
        except Exception as e:
            self.log("FAIL", "Backend Info", f"Error: {str(e)}")
            return False

    def test_chat_endpoint(self) -> bool:
        """Test 3: Chat Endpoint"""
        try:
            payload = {
                "message": "Hello! This is a test message to verify the chat system is working.",
                "conversation_id": None,
            }
            response = requests.post(f"{self.api_url}/chat/", json=payload, timeout=30)

            if response.status_code == 200:
                data = response.json()
                if "message" in data and "conversation_id" in data:
                    msg_preview = (
                        data["message"][:50] + "..."
                        if len(data["message"]) > 50
                        else data["message"]
                    )
                    self.log("PASS", "Chat Endpoint", f"AI responded: {msg_preview}")
                    return True
                else:
                    self.log(
                        "FAIL", "Chat Endpoint", "Response missing required fields"
                    )
                    return False
            else:
                error_detail = response.json().get("detail", "Unknown error")
                self.log(
                    "FAIL",
                    "Chat Endpoint",
                    f"Status {response.status_code}: {error_detail}",
                )
                return False
        except requests.exceptions.Timeout:
            self.log(
                "FAIL", "Chat Endpoint", "Request timed out (NVIDIA API may be slow)"
            )
            return False
        except Exception as e:
            self.log("FAIL", "Chat Endpoint", f"Error: {str(e)}")
            return False

    def test_conversations_endpoint(self) -> bool:
        """Test 4: Conversations List"""
        try:
            response = requests.get(f"{self.api_url}/chat/conversations", timeout=5)
            if response.status_code == 200:
                conversations = response.json()
                count = len(conversations) if isinstance(conversations, list) else 0
                self.log("PASS", "Conversations", f"Found {count} conversation(s)")
                return True
            else:
                self.log(
                    "FAIL", "Conversations", f"Status code: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log("FAIL", "Conversations", f"Error: {str(e)}")
            return False

    def test_frontend_build(self) -> bool:
        """Test 5: Frontend Configuration"""
        try:
            # Check if package.json exists and has correct scripts
            import os

            frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
            package_json = os.path.join(frontend_path, "package.json")

            if os.path.exists(package_json):
                with open(package_json, "r") as f:
                    data = json.load(f)
                    if "scripts" in data and "dev" in data["scripts"]:
                        self.log(
                            "PASS",
                            "Frontend Config",
                            "package.json configured correctly",
                        )
                        return True

            self.log(
                "FAIL", "Frontend Config", "package.json not found or misconfigured"
            )
            return False
        except Exception as e:
            self.log("FAIL", "Frontend Config", f"Error: {str(e)}")
            return False

    def test_placeholder_in_source(self) -> bool:
        """Test 6: Placeholder in Source Code"""
        try:
            import os

            chat_tsx = os.path.join(
                os.path.dirname(__file__), "..", "frontend", "src", "pages", "Chat.tsx"
            )

            if os.path.exists(chat_tsx):
                with open(chat_tsx, "r", encoding="utf-8") as f:
                    content = f.read()
                    if 'placeholder="Ask me anything..."' in content:
                        self.log(
                            "PASS",
                            "Placeholder Check",
                            'Found placeholder="Ask me anything..." in Chat.tsx',
                        )
                        return True
                    else:
                        self.log(
                            "FAIL",
                            "Placeholder Check",
                            "Placeholder not found in source",
                        )
                        return False
            else:
                self.log("FAIL", "Placeholder Check", "Chat.tsx not found")
                return False
        except Exception as e:
            self.log("FAIL", "Placeholder Check", f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "=" * 70)
        print("  NVIDIA NEXUS - CHAT PLACEHOLDER END-TO-END TEST")
        print("=" * 70 + "\n")

        print("Testing Backend...")
        print("-" * 70)
        t1 = self.test_backend_health()
        t2 = self.test_backend_info()
        t3 = self.test_chat_endpoint()
        t4 = self.test_conversations_endpoint()

        print("\nTesting Frontend Configuration...")
        print("-" * 70)
        t5 = self.test_frontend_build()
        t6 = self.test_placeholder_in_source()

        # Summary
        passed = sum([t1, t2, t3, t4, t5, t6])
        total = 6

        print("\n" + "=" * 70)
        print(f"  TEST RESULTS: {passed}/{total} PASSED")
        print("=" * 70 + "\n")

        if passed == total:
            print("✓ All tests passed! The chat interface is ready for manual testing.")
            print("\nNext steps:")
            print("1. Start frontend: cd frontend && npm run dev")
            print("2. Open Chrome: http://localhost:3000")
            print("3. Navigate to Chat page")
            print("4. Verify placeholder 'Ask me anything...' is visible")
            print("5. Send a test message")
        else:
            print("✗ Some tests failed. Please check the errors above.")
            print("\nTroubleshooting:")
            if not t1:
                print(
                    "  - Start backend: cd backend && python -m uvicorn app.main:app --reload"
                )
            if not t3:
                print("  - Check NVIDIA_API_KEY in .env file")
                print("  - Verify internet connection")

        return passed == total


def main():
    """Main function"""
    print("\nWaiting for backend to be ready...")
    time.sleep(2)

    tester = ChatTester()
    success = tester.run_all_tests()

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
