---
name: ux-writing
description: >-
  Write and edit interface copy: buttons, labels, titles, form fields, error,
  success and empty-state messages, notifications, confirmations and onboarding.
  Use when writing new UI text, choosing wording for a component, or setting voice
  and tone for a screen. NOT for stripping AI patterns out of existing copy (use
  deslop-ui).
allowed-tools:
  - Read
  - Write
  - Edit
---

# UX Writing

Interface text exists to help someone finish a task. Good copy is:

- **Purposeful**: it helps the user do something or decide something.
- **Concise**: every word has a job. Cut anything that doesn't.
- **Conversational**: it reads like something a person would say.
- **Clear**: one meaning, specific verbs, the same term for the same thing everywhere.

## Ground rules

- Sentence case everywhere: "Save changes", not "Save Changes".
- Put the important part first: "Password must be 8 characters", not "Must be 8 characters for your password".
- Talk to the user as "you". Describe what they get, not what the product offers.
- Use active voice unless the actor doesn't matter or passive is clearer.
- Use the user's words, not internal or system terms.
- Keep articles and prepositions. "Couldn't save changes" beats "Save failed".
- Pick the exact verb. "Delete" when it's permanent, "Remove" when it isn't.

## Patterns

### Titles

Noun phrase that tells users where they are. 3–6 words.
"Account settings", "Your library", "Create post".

### Buttons and links

`[Verb] [object]`. 2–4 words.
"Save changes", "Delete account", "View details".

Avoid "OK", "Submit", "Click here". A link should make sense read on its own: "Read our privacy policy".

### Form fields

- **Label**: always visible, a noun phrase. "Email address".
- **Helper text**: verb first. Say why you need the info if it isn't obvious.
- **Placeholder**: example format only ("name@example.com"). Never use it as the label.

### Errors

Say what went wrong, why if it helps, and what to do next. Never end on a dead end.

| Type | Pattern | Example |
| --- | --- | --- |
| Inline validation | `[Field] [requirement]` | "Email must include @" |
| System (banner/modal) | `[What failed]. [Cause]. [Fix].` | "Couldn't save changes. Connection lost. Reconnect and try again." |
| Blocking (full screen) | `[What's blocked]. [Why]. [Action].` | "Subscription expired. Your account is paused. Renew to restore access." |
| Permission request | `[Benefit]. [Permission].` | "Get notified when orders ship. Turn on notifications." |

Show inline errors on blur, next to the field. Ask for permissions when the feature is first used, not at launch.

Don't:
- show bare codes ("Error 403")
- blame the user ("Invalid input", "Illegal character")
- go vague ("Something went wrong", "An error has occurred")

### Success

Past tense, specific, short. "Changes saved", "Email sent". Celebrate only in proportion to what the user did.

### Empty states

Say why it's empty and how to fill it.
"No messages yet. Start a conversation to connect with your team."

A first-use, a cleared list and a search with no results each need different copy.

### Confirmations

For destructive or high-stakes actions, state the consequence plainly and label the button with the action.
"Delete account? You'll lose all your data. This can't be undone." → **Delete account** / **Cancel**

Don't guilt-trip ("No, I don't want to save money").

### Notifications

Verb-first title plus a line of context. 10–15 words total.
"Update required. Install the latest version to continue."

## Tone

The voice stays the same across the product. Tone shifts with what the user is going through and what's at stake:

| User state | Tone | Example |
| --- | --- | --- |
| Frustrated (errors, blockers) | Calm, no blame, recovery first | "Payment failed. Your card was declined. Try a different card." |
| Confused (first use, complex flows) | Patient, step by step | "Connect your bank to see spending insights. We'll walk you through it." |
| Routine (repeat tasks) | Minimal | "Saved" |
| Cautious (data loss, money) | Serious, explicit about consequences | "Delete account? This can't be undone." |
| Successful | Brief, warm | "Profile updated. Your changes are live." |

Don't use jokes in errors, confirmations or anything involving money or data loss.

## Accessibility

- Don't convey meaning with color alone. Pair a red outline with text like "Email is required".
- Button and link labels must make sense out of context, since screen readers often list them on their own.
- Write error text so it reads correctly when announced together with its field label.
- Give icons and images text alternatives. Add an `aria-label` when the visible text isn't enough.
- Aim for sentences under about 14 words and plain language. Define domain terms the first time you use them.

## Length guide

| Element | Target |
| --- | --- |
| Button | 2–4 words, 6 max |
| Title | 3–6 words, ≤40 characters |
| Error | 12–18 words, including the fix |
| Instruction | ≤20 words |
| Line length | 40–60 characters |

## Editing pass

When writing or reviewing copy, check it in this order:

1. **Purpose**: does it help the user do the thing they came to do? Does it answer the question they're likely to have?
2. **Concision**: cut redundant words, merge repeated information, put the key point first.
3. **Voice**: read it aloud. Would a person say this? Remove corporate filler.
4. **Clarity**: are the verbs specific and the terms consistent? Could it be read two ways?

Before drafting, find out who the user is, what they're trying to do and how they likely feel at that moment. Then write what you'd say to them in person, and fit it to the pattern above.
