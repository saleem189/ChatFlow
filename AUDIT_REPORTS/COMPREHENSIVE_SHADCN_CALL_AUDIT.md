# Comprehensive Call & UI/UX Shadcn Compliance Audit
**Date:** 2025-12-11
**Scope:** Video/Audio Call Functionality + Complete App UI/UX

## Executive Summary

This audit reviews the video/audio call functionality and overall application UI/UX to ensure 100% shadcn/ui compliance. The application uses a custom WebRTC implementation with Simple Peer for real-time communication.

---

## Part 1: Video/Audio Call Functionality Analysis

### Current Implementation

#### Architecture
- **WebRTC Library:** Simple Peer
- **State Management:** Custom hooks (`use-video-call`, `use-media-stream`, `use-peer-connection`)
- **Socket Integration:** Socket.io for signaling
- **Context Provider:** `VideoCallProvider` for global call state

#### Call Flow

**1v1 Calls:**
1. User clicks video/audio icon in chat header
2. `initiateCall()` is called with `roomId`, `callType`, and optional `targetUserId`
3. Media stream is acquired (audio + video for video calls)
4. Socket emits `call-initiate` event
5. Recipient receives `incoming-call` event
6. `IncomingCallDialog` displays with accept/decline options
7. On accept, WebRTC peer connection is established
8. Streams are exchanged and displayed

**Group Calls:**
- `joinCall()` function exists but is not fully implemented
- Shows toast: "Join call functionality coming soon"
- **Issue:** Group call functionality is incomplete

#### Call Controls
- Mute/Unmute audio
- Enable/Disable video
- Screen sharing (start/stop)
- End call
- Settings menu (audio/video settings - not implemented)

---

## Part 2: Shadcn Compliance Issues in Call Components

### 🔴 CRITICAL ISSUES

#### 1. **IncomingCallDialog** (`features/video-call/components/incoming-call-dialog.tsx`)

**Hard-coded Colors:**
```tsx
// Line 32-33: Hard-coded primary colors
ring-4 ring-primary-200 dark:ring-primary-800

// Line 34: Hard-coded gradient
from-primary-400 to-blue-500

// Line 38: Hard-coded primary color
bg-primary-500

// Line 49-51: Hard-coded surface colors
text-surface-900 dark:text-white
text-surface-500 dark:text-surface-400

// Line 77-78: Hard-coded button colors
bg-green-500 hover:bg-green-600
bg-primary-500 hover:bg-primary-600
```

**Fix:** Use design system variables (`primary`, `accent`, `muted`, `foreground`, etc.)

#### 2. **CallControls** (`features/video-call/components/call-controls.tsx`)

**Hard-coded Colors:**
```tsx
// Line 40: Hard-coded surface color
bg-surface-900/80

// Line 48-49, 64-65: Hard-coded colors
bg-red-500 hover:bg-red-600
bg-surface-700 hover:bg-surface-600

// Line 80-81: Hard-coded primary colors
bg-primary-500 hover:bg-primary-600

// Line 99, 116: Hard-coded surface and red colors
bg-surface-700 hover:bg-surface-600
bg-red-500 hover:bg-red-600
```

**Fix:** Replace with shadcn variants and design system colors

#### 3. **ParticipantVideo** (`features/video-call/components/participant-video.tsx`)

**Hard-coded Colors:**
```tsx
// Line 76-77: Hard-coded surface and primary colors
bg-surface-900
ring-2 ring-primary-500

// Line 95: Hard-coded gradient
from-primary-400 to-blue-500

// Line 98: Hard-coded fallback colors
bg-white/20 text-white

// Line 119-125: Hard-coded red and green colors
bg-red-500/80
bg-green-500/80
bg-surface-800/80

// Line 138: Hard-coded primary color
bg-primary-500/80
```

**Fix:** Use design system colors

#### 4. **VideoCallModal** (`features/video-call/components/video-call-modal.tsx`)

**Hard-coded Colors:**
```tsx
// Line 52: Hard-coded surface color
bg-surface-900

// Line 65: Hard-coded text color
text-surface-400

// Line 82: Hard-coded border and bg colors
border-surface-700 bg-surface-800/50
```

**Fix:** Use design system variables

#### 5. **ResizableVideoCallWindow** (`features/video-call/components/resizable-video-call-window.tsx`)

**Custom Implementation:**
- Entirely custom draggable/resizable window
- Does not use shadcn Dialog or Sheet components
- Custom styling throughout

**Fix:** Refactor to use shadcn `Dialog` or `Sheet` with custom modifications if needed

---

## Part 3: Call UX Improvements Needed

### Missing Features

1. **Group Call Support:**
   - `joinCall()` function is stubbed out
   - No UI for joining active group calls
   - No participant limit enforcement in UI

2. **Call Notifications:**
   - No browser notification for incoming calls (only toast)
   - No ringtone playing
   - No vibration on mobile

3. **Call Quality Indicators:**
   - No network quality indicator
   - No bandwidth usage display
   - No latency/ping display

4. **Recording:**
   - Recording flag exists in types but not implemented
   - No UI for recording controls

5. **Settings Menu:**
   - Settings dropdown exists but menu items don't do anything
   - No device selection (microphone/camera/speaker)
   - No quality settings

6. **Participant Management:**
   - No way to mute others (for host)
   - No way to remove participants (for host)
   - No way to promote to host/moderator

7. **Chat During Call:**
   - Config has `enableChat` but no in-call chat UI

---

## Part 4: Global UI/UX Shadcn Compliance Issues

### Components Already Fixed
✅ Chat Sidebar - Using shadcn Sidebar components
✅ Message Input - Using shadcn Button, Textarea
✅ Settings Modal - Using shadcn Form, Tabs, Switch, Label, Card
✅ Message Item - Using shadcn Button, Tooltip, HoverCard
✅ Message Reactions - Using shadcn Badge, Button, Popover
✅ Search Dialog - Using shadcn CommandDialog

### Components Still Needing Review

#### Admin Components
Need to check:
- `admin-sidebar.tsx`
- `admin-stats.tsx`
- `online-users.tsx`
- `recent-activity.tsx`
- `realtime-chart.tsx`
- `room-detail.tsx`
- `message-activity-chart.tsx`
- `user-activity-chart.tsx`

#### Chat Components
- `create-room-modal.tsx` - Check for hard-coded colors
- `room-settings-modal.tsx` - Check for hard-coded colors
- `emoji-picker.tsx` - Check if using shadcn patterns
- `voice-recorder.tsx` - Recently fixed, verify
- `voice-message.tsx` - Recently fixed, verify
- `file-attachment.tsx` - Recently fixed, verify

#### Feature Components
- `mentions/mention-suggestions.tsx` - Just fixed, verified
- `pinned-messages/pinned-messages-panel.tsx` - Need to review
- `quick-replies/quick-reply-picker.tsx` - Need to review

---

## Part 5: Recommended Implementation Plan

### Phase 1: Fix Critical Call UI Issues (Priority: HIGH)
1. Replace all hard-coded colors in call components with design system variables
2. Add shadcn Tooltip components to all call control buttons
3. Ensure Avatar components follow shadcn standard implementation

### Phase 2: Enhance Call Functionality (Priority: MEDIUM)
1. Complete group call implementation
2. Add device selection (audio/video input/output)
3. Add call quality indicators
4. Implement browser notifications for incoming calls
5. Add call history/logs

### Phase 3: Refactor Resizable Window (Priority: LOW)
1. Evaluate if shadcn Dialog can be extended for draggable/resizable behavior
2. If not, ensure custom implementation uses design system colors/variables
3. Add keyboard shortcuts (Escape to close, etc.)

### Phase 4: Global UI/UX Audit (Priority: HIGH)
1. Review all remaining components for shadcn compliance
2. Replace any remaining hard-coded colors
3. Ensure all interactive elements have proper hover/focus states
4. Verify all forms use shadcn Form components
5. Verify all modals/dialogs use shadcn Dialog components

---

## Part 6: Shadcn Component Mapping

### Components to Use

| Feature | Shadcn Component |
|---------|------------------|
| Call Buttons | `Button` with variants |
| Call Controls | `ToggleGroup` + `Toggle` |
| Incoming Call | `Dialog` with custom content |
| Settings Menu | `DropdownMenu` |
| Participant List | `ScrollArea` + `Card` |
| Call Status | `Badge` |
| Device Selection | `Select` |
| Quality Indicator | `Progress` |
| Tooltips | `Tooltip` |
| Notifications | `toast` (sonner) |

---

## Part 7: Design System Consistency

### Color Variables to Use
- `background` - Main background
- `foreground` - Main text
- `card` - Card backgrounds
- `card-foreground` - Card text
- `popover` - Popover backgrounds
- `popover-foreground` - Popover text
- `primary` - Primary actions
- `primary-foreground` - Primary text
- `secondary` - Secondary actions
- `secondary-foreground` - Secondary text
- `muted` - Muted backgrounds
- `muted-foreground` - Muted text
- `accent` - Accent elements
- `accent-foreground` - Accent text
- `destructive` - Destructive actions (e.g., end call)
- `destructive-foreground` - Destructive text
- `border` - Borders
- `input` - Input borders
- `ring` - Focus rings

### Never Use
- ❌ `surface-*` colors (not in design system)
- ❌ `primary-400`, `primary-500`, `primary-600` (use `primary`)
- ❌ `blue-500`, `green-500`, `red-500` (use semantic colors)
- ❌ Hard-coded hex values
- ❌ `dark:` prefix with custom colors (use CSS variables)

---

## Part 8: Testing Requirements

### After Fixes
1. Test 1v1 video call (initiate, accept, decline, end)
2. Test 1v1 audio call (initiate, accept, decline, end)
3. Test call controls (mute, video toggle, screen share)
4. Test in light and dark mode
5. Test with different screen sizes
6. Test keyboard navigation
7. Test screen reader compatibility

---

## Conclusion

The video/audio call functionality is well-architected but needs significant UI/UX improvements for shadcn compliance and feature completeness. The main issues are:

1. **Pervasive use of hard-coded colors** instead of design system variables
2. **Incomplete group call implementation**
3. **Missing essential call features** (device selection, quality indicators, notifications)
4. **Custom resizable window** doesn't follow shadcn patterns

Estimated work: 4-6 hours to fix all shadcn compliance issues and complete group call implementation.

