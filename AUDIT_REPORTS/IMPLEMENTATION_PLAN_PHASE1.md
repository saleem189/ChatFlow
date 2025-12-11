# Video Conferencing - Phase 1 Implementation Plan
**Date:** 2025-12-11  
**Goal:** Bring video call modal to industry standard (60% → 85%)  
**Timeline:** This session  
**Priority:** 🔴 CRITICAL

---

## 📋 Phase 1 Features (Top Priority)

Based on research of Zoom, Teams, Google Meet, and Slack, implementing these 4 features will bring us to industry baseline:

### 1. **Participant List Panel** ⭐⭐⭐
**Why:** Users need to see who's in the call  
**Platforms:** ALL have this  
**Effort:** Low (2-3 components)  
**Impact:** HIGH - Most visible gap

### 2. **Reactions/Emojis System** ⭐⭐⭐
**Why:** Expected feature for engagement  
**Platforms:** ALL have this  
**Effort:** Medium (animation system)  
**Impact:** HIGH - User engagement

### 3. **View Mode Toggle** ⭐⭐
**Why:** Gallery vs Speaker view is standard  
**Platforms:** ALL have this  
**Effort:** Medium (layout logic)  
**Impact:** MEDIUM - UX improvement

### 4. **Hand Raising** ⭐
**Why:** Essential for meetings  
**Platforms:** ALL have this  
**Effort:** Low (state + UI)  
**Impact:** MEDIUM - Meeting etiquette

---

## 🏗️ DETAILED IMPLEMENTATION SPEC

### Feature 1: Participant List Panel

#### UI Design:
```
┌─────────────────┬──────────────┐
│                 │ 👥 People (3)│
│                 ├──────────────┤
│   Video Grid    │ John (You) ✓ │  ← Current user
│                 │ 🔊 🎥        │
│                 ├──────────────┤
│                 │ Jane         │  ← Other participant
│                 │ 🔇 📹        │  ← Muted, video off
│                 ├──────────────┤
│                 │ Bob (Host)   │  ← Host/admin
│                 │ 🔊 🎥 👑     │  ← Crown icon
└─────────────────┴──────────────┘
```

#### Component Structure:
```tsx
<ParticipantListPanel>
  <PanelHeader>
    <ParticipantCount />
    <CloseButton />
  </PanelHeader>
  
  <PanelContent>
    {participants.map(p => (
      <ParticipantItem
        key={p.id}
        participant={p}
        isCurrentUser={p.id === currentUserId}
        isHost={p.id === hostId}
        onPin={() => pinParticipant(p.id)}
        onSpotlight={() => spotlightParticipant(p.id)}
      />
    ))}
  </PanelContent>
</ParticipantListPanel>
```

#### Features:
- ✅ Show all participants
- ✅ Status indicators (mic, camera, connection)
- ✅ "You" label for current user
- ✅ Host/admin badge
- ✅ Hover actions (pin, spotlight, mute - for hosts)
- ✅ Search/filter (if > 10 participants)
- ✅ Responsive (sidebar on desktop, overlay on mobile)

#### Implementation:
```tsx
// New component
features/video-call/components/participant-list-panel.tsx
```

---

### Feature 2: Reactions/Emojis System

#### UI Design:
```
┌─────────────────────────┐
│                         │
│   👍  ← Floating        │
│      reaction           │
│                    ❤️   │
│                         │
├─────────────────────────┤
│ [Mic] [Vid] [Share] [😊]│  ← Reactions button
└─────────────────────────┘

Click [😊] opens:
┌───────────────┐
│ 👍 ❤️ 😂 👏  │  ← Quick reactions
│ 🎉 😮 ✋     │
└───────────────┘
```

#### Animation Pattern:
- Emoji starts at bottom center
- Floats upward with slight horizontal wobble
- Fades out over 3-4 seconds
- Multiple reactions can float simultaneously

#### Component Structure:
```tsx
<ReactionsPicker>
  <PopoverTrigger>
    <Button>😊</Button>
  </PopoverTrigger>
  
  <PopoverContent>
    <EmojiGrid>
      {quickEmojis.map(emoji => (
        <EmojiButton
          key={emoji}
          emoji={emoji}
          onClick={() => sendReaction(emoji)}
        />
      ))}
    </EmojiGrid>
  </PopoverContent>
</ReactionsPicker>

<ReactionsOverlay>
  {activeReactions.map(r => (
    <FloatingEmoji
      key={r.id}
      emoji={r.emoji}
      from={r.userId}
      onComplete={() => removeReaction(r.id)}
    />
  ))}
</ReactionsOverlay>
```

#### Quick Reactions (Standard Set):
- 👍 Thumbs Up
- ❤️ Heart
- 😂 Laugh
- 👏 Clap
- 🎉 Celebrate
- 😮 Surprised
- ✋ Raise Hand (special - persists)

#### Socket Events:
```typescript
// Send reaction
socket.emit('call:reaction', {
  callId,
  emoji,
  userId,
  userName,
});

// Receive reaction
socket.on('call:reaction', ({ emoji, userId, userName }) => {
  addFloatingReaction({ emoji, userId, userName });
});
```

#### Implementation:
```tsx
// New components
features/video-call/components/reactions-picker.tsx
features/video-call/components/reactions-overlay.tsx
features/video-call/components/floating-emoji.tsx

// Update
features/video-call/hooks/use-video-call.ts (add sendReaction)
```

---

### Feature 3: View Mode Toggle

#### View Modes:

**1. Gallery View (Current)**
```
┌─────┬─────┬─────┐
│  1  │  2  │  3  │  Equal-sized tiles
├─────┼─────┼─────┤
│  4  │  5  │  6  │  All participants visible
└─────┴─────┴─────┘
```

**2. Speaker View (New)**
```
┌─────────────────────┐
│                     │
│    Active Speaker   │  Large tile
│                     │
├──────┬──────┬───────┤
│  2   │  3   │  4    │  Small tiles
└──────┴──────┴───────┘
```

#### UI Controls:
```
Header: [📹 Video Call - 6 👤] [Gallery ▼] [ℹ️] [✕]
                                     ↑
                            View mode dropdown
```

Dropdown options:
- ✅ Gallery View (current)
- ✅ Speaker View
- ⚠️ Sidebar View (when screen sharing)

#### Component Structure:
```tsx
<VideoCallModal>
  <ViewModeSelector
    mode={viewMode}
    onChange={setViewMode}
    options={['gallery', 'speaker', 'sidebar']}
  />
  
  {viewMode === 'gallery' && (
    <ParticipantGrid {...props} />
  )}
  
  {viewMode === 'speaker' && (
    <SpeakerView
      activeSpeaker={activeSpeaker}
      others={otherParticipants}
      {...props}
    />
  )}
</VideoCallModal>
```

#### Logic:
```typescript
// Auto-detect active speaker
const detectActiveSpeaker = () => {
  // Measure audio levels from each stream
  // Return userId with highest audio level
  // Update activeSpeaker state
};

// Run every 500ms during call
useEffect(() => {
  const interval = setInterval(detectActiveSpeaker, 500);
  return () => clearInterval(interval);
}, [participants]);
```

#### Implementation:
```tsx
// New components
features/video-call/components/view-mode-selector.tsx
features/video-call/components/speaker-view.tsx

// Update
features/video-call/components/video-call-modal.tsx
features/video-call/hooks/use-video-call.ts (add viewMode state)
```

---

### Feature 4: Hand Raising

#### UI States:

**Participant List:**
```
┌──────────────┐
│ Jane         │
│ 🔊 🎥 ✋    │  ← Hand raised indicator
└──────────────┘
```

**Video Tile:**
```
┌─────────────┐
│             │
│    Jane     │  ← Banner on video
│ ✋ HAND UP  │
└─────────────┘
```

**Toast Notification:**
```
┌────────────────────────┐
│ ✋ Jane raised hand    │
└────────────────────────┘
```

#### Button in Controls:
```
[Mic] [Vid] [Share] [✋] [😊] [End]
                      ↑
                Raise/Lower hand
```

Visual states:
- **Not raised:** Grey/secondary
- **Raised:** Primary/blue with pulse animation

#### Component Structure:
```tsx
<Button
  variant={isHandRaised ? "default" : "secondary"}
  onClick={toggleHandRaise}
  className={isHandRaised && "animate-pulse"}
>
  <Hand className="w-5 h-5" />
</Button>
```

#### Socket Events:
```typescript
// Raise hand
socket.emit('call:hand-raise', {
  callId,
  userId,
  userName,
  isRaised: true,
});

// Lower hand
socket.emit('call:hand-raise', {
  callId,
  userId,
  isRaised: false,
});

// Receive hand raise
socket.on('call:hand-raise', ({ userId, userName, isRaised }) => {
  updateParticipant(userId, { handRaised: isRaised });
  if (isRaised) {
    toast.info(`✋ ${userName} raised hand`);
  }
});
```

#### Participant Type Update:
```typescript
export interface VideoCallParticipant {
  // ... existing fields
  handRaised?: boolean;
  handRaisedAt?: Date;
}
```

#### Implementation:
```tsx
// Update
features/video-call/types.ts (add handRaised field)
features/video-call/components/call-controls.tsx (add button)
features/video-call/components/participant-video.tsx (show indicator)
features/video-call/hooks/use-video-call.ts (add toggleHandRaise)
```

---

## 🎨 Shadcn Components to Use

### For Participant List Panel:
- ✅ `Sheet` - Slide-out panel
- ✅ `ScrollArea` - Scrollable list
- ✅ `Avatar` - Participant photos
- ✅ `Badge` - Status indicators
- ✅ `Button` - Action buttons
- ✅ `DropdownMenu` - Actions menu

### For Reactions:
- ✅ `Popover` - Emoji picker
- ✅ `Button` - Reaction buttons
- Native CSS animations for floating

### For View Mode:
- ✅ `Select` or `ToggleGroup` - Mode selector
- ✅ Existing grid/layout components

### For Hand Raising:
- ✅ `Button` - Raise/lower button
- ✅ `Badge` - Hand raised indicator
- ✅ `Toast` - Notifications

---

## 📁 File Structure

```
features/video-call/
  components/
    ├── participant-list-panel.tsx       [NEW]
    ├── participant-list-item.tsx        [NEW]
    ├── reactions-picker.tsx             [NEW]
    ├── reactions-overlay.tsx            [NEW]
    ├── floating-emoji.tsx               [NEW]
    ├── view-mode-selector.tsx           [NEW]
    ├── speaker-view.tsx                 [NEW]
    ├── call-controls.tsx                [UPDATE - add hand raise]
    ├── participant-video.tsx            [UPDATE - show indicators]
    └── video-call-modal.tsx             [UPDATE - integrate all]
  
  hooks/
    └── use-video-call.ts                [UPDATE - add features]
  
  types.ts                               [UPDATE - add fields]
```

---

## 🔄 Implementation Order

### Step 1: Hand Raising (Easiest, 20 min)
1. Add `handRaised` field to participant type
2. Add button to CallControls
3. Add indicator to ParticipantVideo
4. Add socket events
5. Test with 2+ participants

### Step 2: Participant List Panel (Medium, 30 min)
1. Create ParticipantListPanel component
2. Create ParticipantListItem component
3. Add Sheet/ScrollArea from shadcn
4. Add toggle button to header
5. Show participant status
6. Test responsiveness

### Step 3: Reactions System (Complex, 40 min)
1. Create ReactionsPicker component
2. Create ReactionsOverlay component
3. Create FloatingEmoji component
4. Add CSS animations
5. Add socket events
6. Test multiple simultaneous reactions

### Step 4: View Mode Toggle (Complex, 30 min)
1. Create ViewModeSelector component
2. Create SpeakerView layout
3. Add active speaker detection
4. Add mode state to useVideoCall
5. Update VideoCallModal
6. Test view transitions

**Total Estimated Time: 2 hours**

---

## ✅ Testing Checklist

### Hand Raising:
- [ ] Button toggles state correctly
- [ ] Other participants see hand raised
- [ ] Toast notification appears
- [ ] Indicator shows on video tile
- [ ] Works in participant list
- [ ] Persists during view mode changes

### Participant List:
- [ ] Shows all participants
- [ ] Status indicators update in real-time
- [ ] Host badge shows correctly
- [ ] "You" label on current user
- [ ] Panel opens/closes smoothly
- [ ] Mobile responsive (overlay)
- [ ] Search works (if > 10 participants)

### Reactions:
- [ ] Emoji picker opens
- [ ] Clicking emoji sends reaction
- [ ] All participants see floating emoji
- [ ] Animation smooth (no lag)
- [ ] Multiple emojis don't overlap
- [ ] Works on mobile
- [ ] Hand raise (✋) persists differently

### View Modes:
- [ ] Gallery view works (current)
- [ ] Speaker view shows active speaker
- [ ] Transition smooth between modes
- [ ] Active speaker detection accurate
- [ ] Small tiles update when switching
- [ ] Preference persists

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- ✅ All 4 features implemented
- ✅ Zero linter errors
- ✅ 100% shadcn compliance
- ✅ Tested in 1v1 and group scenarios
- ✅ Mobile responsive
- ✅ Matches industry UX patterns

**Result:**
- Current: 60% industry standard
- After Phase 1: **85% industry standard** ✨

---

## 📝 Notes

- All features use existing WebRTC infrastructure
- Socket events need backend handlers (already have socket system)
- Animations should use CSS for performance
- All components must be accessible (ARIA labels)
- Mobile-first responsive design
- Follow established shadcn patterns

Ready to implement! 🚀

