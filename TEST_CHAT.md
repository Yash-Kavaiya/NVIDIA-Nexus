# Chat Placeholder End-to-End Testing Guide

## Overview
This guide will help you test the chat placeholder "Ask me anything..." and verify the complete end-to-end flow from frontend to NVIDIA Nemotron-3 API.

## Prerequisites
- Python 3.13.7 installed ✓
- Node.js v22.20.0 installed ✓
- npm 10.9.3 installed ✓
- NVIDIA API Key configured in `.env` ✓

## Testing Steps

### Step 1: Start the Backend Server

Open a **new terminal** and run:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify Backend:**
Open your browser and visit: http://localhost:8000/docs
You should see the Swagger API documentation.

### Step 2: Start the Frontend Development Server

Open **another new terminal** and run:

```bash
cd frontend
npm install
npm run dev
```

You should see output like:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### Step 3: Open Chrome Browser

1. Open **Google Chrome**
2. Navigate to: http://localhost:3000
3. You should see the NVIDIA Nexus dashboard

### Step 4: Test the Chat Interface

1. Click on **"Chat"** in the left sidebar (or mobile navigation)
2. You should see:
   - Header: "NVIDIA Nemotron-3" with a Bot icon
   - Status: "Online" with a green pulsing dot
   - Welcome message: "How can I help you today?"
   - Description text about capabilities
   - **Chat input at the bottom with placeholder: "Ask me anything..."**

### Step 5: Verify Placeholder

**Visual Check:**
- The textarea at the bottom should display gray placeholder text: "Ask me anything..."
- The placeholder should disappear when you click/focus on the input
- There should be a paperclip icon (attachment) button on the left
- There should be a send button (paper plane icon) on the right

### Step 6: Test End-to-End Chat Flow

**Test Message #1: Simple Greeting**
1. Click in the chat input (placeholder should disappear)
2. Type: "Hello, what can you do?"
3. Press **Enter** or click the **Send** button
4. Observe:
   - Your message appears on the right side with green background
   - A loading indicator appears with "Thinking..." text
   - After a few seconds, the AI response appears on the left side
   - Response should describe NVIDIA Nexus capabilities

**Test Message #2: File Organization Query**
1. Type: "How can you help me organize my files?"
2. Press **Enter**
3. Verify the AI responds with information about file organization features

**Test Message #3: Multi-line Input**
1. Type a message
2. Press **Shift + Enter** to create a new line (should NOT send)
3. Continue typing on the next line
4. Press **Enter** to send the complete multi-line message

### Step 7: Chrome DevTools Testing

**Open Chrome DevTools:**
1. Press **F12** or **Right-click → Inspect**
2. Go to the **Console** tab
3. Check for any errors (there should be none)

**Network Tab:**
1. Go to the **Network** tab in DevTools
2. Send a chat message
3. Look for a POST request to: `http://localhost:8000/api/chat/`
4. Click on it to see:
   - **Request Payload:** Should contain your message
   - **Response:** Should contain AI response and conversation_id

**Elements Tab:**
1. Go to the **Elements** tab
2. Find the textarea element (use Select Element tool)
3. Verify the `placeholder` attribute is set to: "Ask me anything..."

### Expected Results

✅ **Success Criteria:**
- [ ] Placeholder "Ask me anything..." is visible when input is empty
- [ ] Placeholder disappears when input is focused
- [ ] Messages are sent successfully to backend
- [ ] Backend communicates with NVIDIA API
- [ ] AI responses appear in the chat
- [ ] No console errors
- [ ] Network requests show successful 200 responses
- [ ] Conversation is maintained across multiple messages

❌ **Troubleshooting:**

**If backend fails to start:**
- Check if port 8000 is already in use
- Verify NVIDIA_API_KEY is set in `.env` file
- Check Python dependencies are installed

**If frontend fails to start:**
- Run `npm install` in the frontend directory
- Check if port 3000 is already in use
- Clear npm cache: `npm cache clean --force`

**If chat doesn't send messages:**
- Verify backend is running on port 8000
- Check browser console for CORS errors
- Verify `.env` has correct CORS_ORIGINS setting

**If NVIDIA API returns errors:**
- Verify NVIDIA_API_KEY is valid
- Check internet connection
- Check API quota/rate limits at NVIDIA's developer portal

## Chat Component Details

**File:** `frontend/src/pages/Chat.tsx`

**Placeholder Location:** Line 171
```tsx
<textarea
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Ask me anything..."  // <-- PLACEHOLDER HERE
  className="nvidia-input w-full resize-none py-3"
  rows={1}
  disabled={isLoadingChat}
/>
```

**Styling:** The placeholder color is defined in `frontend/src/index.css` (lines 98-113)

## API Flow

```
User Input → Frontend (React)
    ↓
Store Update (Zustand)
    ↓
API Call (chatApi.sendMessage)
    ↓
Backend (FastAPI) - /api/chat/
    ↓
AI Service (ai_service.py)
    ↓
NVIDIA Nemotron-3 API
    ↓
Response → Frontend → Display
```

## Testing Complete!

If all steps pass, the chat placeholder is working correctly end-to-end. The system successfully:
1. Displays the placeholder in the UI
2. Captures user input
3. Sends requests to the backend
4. Communicates with NVIDIA's API
5. Displays AI responses
6. Maintains conversation context

## Screenshots to Take (for verification)

1. Chat page with placeholder visible
2. Chat page after typing (placeholder gone)
3. Chat with user message sent
4. Chat with AI response received
5. Chrome DevTools Network tab showing successful API call
6. Chrome DevTools Console (no errors)

---

**Test Date:** February 4, 2026
**Tested By:** [Your Name]
**Status:** [PASS / FAIL]
