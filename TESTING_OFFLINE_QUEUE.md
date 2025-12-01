# Testing Offline Queue Functionality

## 🧪 How to Test Offline Message Queue

### Prerequisites
1. Make sure your dev server is running (`npm run dev`)
2. Be logged into the chat application
3. Have at least one chat room open

---

## 📋 Step-by-Step Testing Guide

### Test 1: Send Message While Offline

1. **Open DevTools** (F12 or Right-click → Inspect)
2. **Go to Network Tab**
3. **Set Network to Offline**:
   - Click the dropdown that says "No throttling" or "Online"
   - Select "Offline"
   - OR use the "Offline" checkbox in the Network tab

4. **In the Chat Application**:
   - Navigate to a chat room
   - Type a message in the input field
   - Click "Send" or press Enter

5. **Expected Behavior**:
   - ✅ You should see a toast notification: "You're offline. This will be sent when you're back online."
   - ✅ The message should appear in the chat (optimistic update)
   - ✅ The message should have a "sending" status indicator

6. **Check Console**:
   - Open Console tab in DevTools
   - You should see the message was queued (no errors)

### Test 2: Send Multiple Messages While Offline

1. **Keep Network Offline**
2. **Send 3-5 messages** in quick succession
3. **Expected Behavior**:
   - ✅ All messages should appear in chat
   - ✅ All should show "sending" status
   - ✅ Toast notification for each queued message

### Test 3: Go Back Online (Auto-Process Queue)

1. **Keep the messages you sent while offline**
2. **Go to Network Tab in DevTools**
3. **Set Network back to Online**:
   - Change dropdown from "Offline" to "Online" or "No throttling"

4. **Expected Behavior**:
   - ✅ You should see a toast: "X message(s) sent successfully" (where X is the number of queued messages)
   - ✅ All queued messages should change from "sending" to "sent" status
   - ✅ Messages should appear for other users (if they're in the same room)

5. **Check Network Tab**:
   - You should see POST requests to `/api/messages` for each queued message
   - All requests should have status 200 (success)

### Test 4: Edit Message While Offline

1. **Set Network to Offline again**
2. **Right-click on a message** (or long-press on mobile)
3. **Click "Edit"**
4. **Modify the message content**
5. **Save the edit**

6. **Expected Behavior**:
   - ✅ Toast: "You're offline. This will be sent when you're back online."
   - ✅ Message should update optimistically
   - ✅ When you go back online, the edit should be saved

### Test 5: Delete Message While Offline

1. **Set Network to Offline**
2. **Right-click on a message** (or long-press on mobile)
3. **Click "Delete"**
4. **Confirm deletion**

5. **Expected Behavior**:
   - ✅ Toast: "You're offline. This will be sent when you're back online."
   - ✅ Message should show as deleted (optimistic update)
   - ✅ When you go back online, the deletion should be saved

### Test 6: Retry Failed Messages

1. **Send a message while offline**
2. **Go online briefly** (to trigger API call)
3. **Quickly go offline again** (before API completes)
4. **Expected Behavior**:
   - ✅ Message should be queued
   - ✅ When you go back online, it should retry automatically

---

## 🔍 What to Check

### Console Logs
- Open Console tab in DevTools
- Look for:
  - `"Failed to save message:"` - This is expected when offline
  - `"Processing queued actions"` - When going back online
  - No critical errors (red errors)

### Network Tab
- **While Offline**:
  - API requests should fail (red status)
  - Socket connections should disconnect

- **When Going Online**:
  - Multiple POST requests to `/api/messages` should appear
  - All should succeed (200 status)
  - Socket should reconnect

### UI Indicators
- **Message Status**:
  - "sending" - Message is queued
  - "sent" - Message was successfully sent
  - "failed" - Message failed (shouldn't happen with queue)

- **Toast Notifications**:
  - Blue/Info: "You're offline. This will be sent when you're back online."
  - Green/Success: "X message(s) sent successfully"
  - Red/Error: Only if max retries exceeded

---

## 🐛 Troubleshooting

### Messages Not Queuing
- **Check**: Is `useMessageOperations` using `useOfflineQueue`?
- **Check**: Is `isConnected` from `useSocket` working correctly?
- **Check Console**: Look for errors in `use-offline-queue.ts`

### Queue Not Processing
- **Check**: Is socket reconnecting when going online?
- **Check**: Is `isConnected` becoming `true` when online?
- **Check Console**: Look for "Processing queued actions" log

### Messages Not Appearing
- **Check**: Are messages being added optimistically?
- **Check**: Is `addMessage` from `useMessagesStore` working?
- **Check Console**: Look for errors in message operations

---

## ✅ Success Criteria

The offline queue is working correctly if:

1. ✅ Messages can be sent while offline
2. ✅ Toast notification appears when queuing
3. ✅ Messages appear in chat (optimistic update)
4. ✅ Messages are automatically sent when going online
5. ✅ Success toast appears when queue processes
6. ✅ All queued messages change to "sent" status
7. ✅ No messages are lost
8. ✅ Edit and delete operations also queue correctly

---

## 📝 Notes

- The offline queue uses **localStorage** (via Zustand store) to persist queued actions
- Queue automatically processes when `isConnected` becomes `true`
- Default retry: 3 attempts with 2-second delay
- Max queue size: Unlimited (but should be reasonable for UX)

---

## 🎯 Quick Test Checklist

- [ ] Set network to offline
- [ ] Send a message
- [ ] See toast notification
- [ ] Message appears in chat
- [ ] Set network to online
- [ ] See success toast
- [ ] Message status changes to "sent"
- [ ] Check Network tab for successful API calls

