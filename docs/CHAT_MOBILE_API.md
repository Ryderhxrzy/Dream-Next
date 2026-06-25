# Chat / Conversations API — Mobile Reference

Contract for the **customer-facing** support chat used by the mobile app. Every
field below is taken verbatim from the backend response builders
(`CustomerConversationController::formatConversation` / `formatMessage`) and the
routes in `routes/api.php`, so the app never has to guess shapes.

- **Backend:** Laravel (`apps/apsara-home-backend`)
- **Controller:** `app/Http/Controllers/Api/CustomerConversationController.php`
- **Realtime:** `app/Services/ConversationService.php` (Pusher)
- **Last updated:** 2026-06-25

---

## 1. Auth & conventions

- **Base URL:** `<API_BASE>/api`
- **Headers (every request):**
  ```
  Authorization: Bearer <token>
  Accept: application/json
  Content-Type: application/json      # for POST bodies
  ```
- **Token:** from `POST /api/auth/login` → `{ user, token }`. The customer's
  `user.id` **equals** `sender_id` on their own messages (it is the `c_userid`).
- **Guard:** all routes below require the customer Sanctum token. A non-customer
  token gets `403 { "message": "Only customers can access this resource." }`.
- **Timestamps:** format `YYYY-MM-DD HH:MM:SS`, timezone **Asia/Manila with no
  offset**. Append `+08:00` before parsing (e.g. `2026-06-25 11:18:00+08:00`).
- **Pagination wrapper:** list endpoints return
  ```json
  { "data": [ ... ], "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 9 } }
  ```
- **Validation errors:** `422 { "message": "...", "errors": { "field": ["..."] } }`.

---

## 2. Object schemas

### 2.1 Message

Returned by `formatMessage`. Used in `GET /messages`, `POST /messages` (`data`),
and the realtime `message.sent` event (a subset — see §4).

```jsonc
{
  "id": 123, // number
  "conversation_id": 45, // number
  "sender_id": 1001, // number
  "sender_type": "customer", // "customer" | "admin"  ← bubble side
  "message": "Hello", // string
  "is_internal": false, // boolean — ALWAYS false on customer endpoints
  "attachment_url": null, // string | null
  "attachment_filename": null, // string | null
  "is_read": true, // boolean (= read_at !== null)
  "read_at": "2026-06-25 11:20:00", // string | null
  "created_at": "2026-06-25 11:18:00", // string
  "updated_at": "2026-06-25 11:18:00", // string
}
```

> **Bubble side:** `is_mine = sender_type === "customer"`. Do **not** compare ids
> across tables — `sender_type` is computed server-side per conversation and is
> collision-proof.

### 2.2 Conversation

Returned by `formatConversation`. Used in `GET /conversations` list items and as
`data` in `POST /conversations`, `close`, `reopen`.

```jsonc
{
  "id": 45, // number
  "subject": "Support", // string
  "description": null, // string | null
  "order": null, // object | null — present for order-linked threads (see §2.4)
  "status": "open", // "open" | "pending" | "resolved"
  "assigned_agent_id": 7, // number | null
  "assigned_agent": {
    // object | null
    "id": 7,
    "name": "Jane",
    "email": "jane@af.home",
  },
  "last_message": {
    // object | null — NEWEST message, internal excluded
    "message": "supp Yo!",
    "sent_at": "2026-06-25 08:51:00",
    "sender_id": 7,
    "sender_type": "admin", // "customer" | "admin"
  },
  "message_count": 9, // number — excludes internal notes
  "unread_count": 1, // number — excludes internal notes
  "resolved_at": null, // string | null
  "created_at": "2026-06-24 11:00:00", // string
  "updated_at": "2026-06-25 08:51:00", // string
}
```

### 2.4 Order (the `order` field)

A conversation is **order-scoped** when it was started from a specific order — its
`subject` is `"Order {checkout_id}"` and the `order` field is populated (otherwise
`null`). Each order gets its **own** conversation. Use this to show order context
at the top of the thread.

```jsonc
{
  "reference": "cs_00c86a20d1c107ce0dcbff51", // string — the order/checkout id
  "product_name": "LG HOME AUDIO RNC5",        // string | null
  "amount": 59032.15,                          // number | null (PHP)
  "quantity": 5,                               // number | null
  "payment_status": "pending",                 // string | null
  "approval_status": "pending_approval",       // string | null
  "fulfillment_status": "pending"              // string | null
}
```

### 2.3 ConversationDetail

`GET /conversations/{id}` returns `Conversation` **plus** a `user` object. It does
**not** embed messages — fetch them via `GET /conversations/{id}/messages`.

```jsonc
{
  // ...all Conversation fields...
  "user": {
    "id": 1001, // number (c_userid)
    "name": "Benjo Magayanes Quilario", // string
    "email": "benjo@gmail.com", // string
    "username": "benjoquilario", // string
  },
}
```

---

## 3. Endpoints

All paths are under `/api`. Method legend: **GET** read · **POST** write.
(There is no PUT/PATCH on the customer side — close/reopen are POST.)

### 3.1 `GET /conversations` — list the customer's conversations

- **Query:** `status` _(optional: `open|pending|resolved`)_, `per_page` _(optional, default 20)_
- **200:**
  ```json
  {
    "data": [
      /* Conversation */
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 20, "total": 2 }
  }
  ```
- Ordered by `updated_at` DESC (most recently active first).

### 3.2 `POST /conversations` — start (or reuse) a conversation

- **Body (all optional):**

  | Field         | Rule                                   |
  | ------------- | -------------------------------------- |
  | `subject`     | string, ≤255 (defaults to `"Support"`) |
  | `description` | string, ≤2000                          |

- Reuses the customer's latest **non-resolved** thread if one exists; otherwise
  creates a new one. An empty body `{}` is valid.
- **201:**
  ```json
  {
    "message": "Conversation ready.",
    "data": {
      /* Conversation */
    }
  }
  ```

### 3.3 `GET /conversations/{id}` — get one conversation (and mark read)

- Marks the customer's **incoming** messages as read as a side effect.
- **200:** `{ "data": { /* ConversationDetail */ } }`
- **404:** `{ "message": "Conversation not found." }` (not owned by the customer)

### 3.4 `GET /conversations/{id}/messages` — list messages

- **Query:** `per_page` _(optional, default **200**, capped at 200)_
- Order: **oldest-first** (`created_at ASC, id ASC`). Internal notes excluded.
- **200:**
  ```json
  {
    "data": [
      /* Message */
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 200, "total": 9 }
  }
  ```
- ⚠️ **Long threads (>200 messages) — read this.** Page 1 returns the _oldest_
  `per_page`, so requesting page 1 of a thread longer than `per_page` would return
  the **oldest** slice and **drop the newest** messages. Two consequences for a
  polling client:
  1. On reopen/reload you'd render stale (old) messages.
  2. If your poller tracks "newest seen" as `messages[messages.length - 1].id`, it
     would lock onto the oldest-page's last id and **stop detecting new messages**
     (live Pusher `message.sent` masks this until a reload).
  The default of **200** is plenty for support threads. If you genuinely expect
  longer histories, **derive newest-seen from `max(created_at)` / `max(id)` across
  the whole set**, not the array tail — and ask backend to add cursor / "load
  older" paging (not yet implemented).

### 3.5 `POST /conversations/{id}/messages` — send a message

- **Body:**

  | Field                 | Rule             | Required |
  | --------------------- | ---------------- | -------- |
  | `message`             | string, 1–5000   | ✅       |
  | `attachment_url`      | valid URL, ≤2048 | ❌       |
  | `attachment_filename` | string, ≤255     | ❌       |

- **201:** `{ "message": "Message sent successfully.", "data": { /* Message */ } }`
- **422 (closed):** `{ "message": "This conversation has been closed." }` — reopen first (§3.7).
- **404:** not owned. **422:** validation errors.

### 3.6 `POST /conversations/{id}/close` — close (resolve)

- **200:** `{ "message": "Conversation closed successfully.", "data": { /* Conversation, status=resolved */ } }`

### 3.7 `POST /conversations/{id}/reopen` — reopen

- **200:** `{ "message": "Conversation reopened successfully.", "data": { /* Conversation, status=open */ } }`
- The customer may reopen directly (no admin approval in the current build).

### 3.8 `GET /conversations/unread/count` — global unread badge

- **200:** `{ "unread_count": 3 }` _(number)_

### 3.9 `POST /conversations/pusher/auth` — authorize the realtime channel

- **Body:**

  | Field          | Rule                                                  | Required |
  | -------------- | ----------------------------------------------------- | -------- |
  | `socket_id`    | string, ≤100                                          | ✅       |
  | `channel_name` | string, ≤255, must start with `private-conversation-` | ✅       |

- **200:** `{ "auth": "<pusher_key>:<hmac_signature>" }`
- **403:** wrong channel prefix, or conversation not owned.
- **503:** `{ "message": "Pusher is not configured." }`

---

## 4. Realtime (Pusher)

- **Channel:** `private-conversation-{conversationId}` (private). Subscribe with a
  Pusher client; authorize via §3.9 with the Bearer token.
- **Cluster:** `ap1` · **TLS:** on · **App key:** the public Pusher key.
- **Internal notes are never broadcast** on this channel.

### Events

**`message.sent`** — a new message (subset of the Message schema; note: no
`read_at` / `updated_at`):

```jsonc
{
  "id": 124,
  "conversation_id": 45,
  "sender_id": 7,
  "sender_type": "admin",
  "message": "On it!",
  "is_internal": false,
  "attachment_url": null,
  "attachment_filename": null,
  "is_read": false,
  "created_at": "2026-06-25 11:25:00",
}
```

**`conversation.updated`** — status/assignment changes:

```jsonc
{
  "conversation_id": 45,
  "event_type": "conversation.closed", // see list below
  "updated_at": "2026-06-25 11:30:00",
  // + event-specific extras (e.g. resolved_at, agent_id, agent_name)
}
```

`event_type` ∈ `conversation.created` · `agent_assigned` · `agent_unassigned` ·
`conversation.closed` · `conversation.reopened` · `conversation.status_changed`.
Use `closed` / `reopened` / `status_changed` to toggle the composer between the
input and a closed/reopen state.

**`messages.read`** — read receipts:

```jsonc
{
  "conversation_id": 45,
  "message_ids": [120, 121, 122],
  "read_at": "2026-06-25 11:31:00",
}
```

---

## 5. Field-type quick map

| Type               | Fields                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **number**         | `id`, `conversation_id`, `sender_id`, `assigned_agent_id`, `message_count`, `unread_count` |
| **enum string**    | `sender_type` (`customer\|admin`), `status` (`open\|pending\|resolved`)                    |
| **string**         | `message`, `subject`, all timestamps                                                       |
| **string \| null** | `description`, `attachment_url`, `attachment_filename`, `read_at`, `resolved_at`           |
| **boolean**        | `is_internal` (always false here), `is_read`                                               |
| **object \| null** | `last_message`, `assigned_agent`, `user`, `order` (see §2.4)                                |

---

## 6. Recommended client behavior

- **List screen:** show `last_message.message` (now the true latest) + `unread_count`
  badge; visually mute/tag `status === "resolved"` as **Closed**.
- **Bubbles:** `sender_type === "customer"` → right, `"admin"` → left.
- **Closed thread:** disable the composer; show a **Reopen** button → §3.7.
- **Live updates:** subscribe to the Pusher channel. Fallback: poll
  `GET /conversations/{id}/messages` (the web client polls every ~5s).
- **Switching threads:** treat a conversation's messages as ready only when they
  belong to the conversation you opened; show a skeleton until then.

---

## 7. Changelog (server-side, no client action unless noted)

- **2026-06-25** — `last_message` ordering bug fixed: it now returns the **newest**
  message (was returning the oldest). Remove any client workaround.
- **2026-06-25** — `sender_type` added to every message **and** to `last_message`.
  Switch bubble logic to `sender_type`.
- **2026-06-25** — Internal admin notes fully excluded from customer REST responses,
  realtime, `last_message`, and `message_count` / `unread_count`.
- **2026-06-25** — Thread order is deterministic (`created_at ASC, id ASC`).
- **2026-06-25** — `GET /messages` default page size raised to **200** (capped 200);
  see §3.4.
- **2026-06-25** — **Order-scoped conversations**: a conversation started from an
  order has `subject = "Order {checkout_id}"` and a populated **`order`** object
  (name/price/status). Each order gets its own thread (see §2.4). The generic
  customer "start chat" never reuses an order thread. **Show the `order` info at the
  top of the thread when present.**
- **2026-06-25** — `sender_type` is now **persisted per message at write time**
  (the sending endpoint sets `customer` / `admin`), instead of being inferred from
  ids. Same values, same contract — just bulletproof against the cross-table id
  collision. No client change: keep using `is_mine = sender_type === "customer"`.
  (An explicit per-message `is_mine` is available on request but is redundant.)

---

## Appendix A — Admin / agent endpoints (only if the app has a staff side)

Role-gated: `auth:sanctum` + `admin.role:super_admin,admin,csr`. Same Message /
Conversation shapes (admin Conversation also includes a `customer` object and the
detail includes an embedded `messages[]` array).

| Method    | Path                                           | Key body                                                                 |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| GET       | `/api/admin/conversations`                     | query: `status`, `assigned_to_me`, `search`, `customer_id`, `per_page`   |
| POST      | `/api/admin/conversations/with-customer`       | **`customer_id`**, `subject?` — find-or-creates per **subject**; pass `subject: "Order {checkout_id}"` for an order-scoped thread |
| GET       | `/api/admin/conversations/open`                | —                                                                        |
| GET       | `/api/admin/conversations/statistics`          | —                                                                        |
| GET       | `/api/admin/conversations/{id}`                | returns detail **with** `messages[]`                                     |
| POST      | `/api/admin/conversations/{id}/assign-agent`   | **`agent_id`**                                                           |
| POST      | `/api/admin/conversations/{id}/unassign-agent` | —                                                                        |
| POST      | `/api/admin/conversations/{id}/messages`       | **`message`**, `is_internal?`, `attachment_url?`, `attachment_filename?` |
| GET       | `/api/admin/conversations/{id}/messages`       | query: `internal=true` to include notes, `per_page`                      |
| **PATCH** | `/api/admin/conversations/{id}/status`         | **`status`** (`open\|pending\|resolved`)                                 |
| POST      | `/api/admin/conversations/pusher/auth`         | `socket_id`, `channel_name`                                              |
