# Security Specification: Real-Time Sync Hub

## 1. Data Invariants
1. **User Identity Isolation**: An item document must only be read, modified, or deleted by its authenticated creator (`userId == request.auth.uid`).
2. **Key Whitelisting**: Every incoming document payload must contain strictly defined keys (`hasAll` for mandatory, `hasOnly` for permitted). No unexpected fields or ghost fields are permitted.
3. **Temporal Trust**: Timestamps (`createdAt`, `updatedAt`) must strictly match `request.time`. Client-supplied past or future timestamps must be rejected.
4. **Immutability of Provenance**: `userId` and `createdAt` must remain immutable across all updates.
5. **Type & Bounds Guard**: String lengths (e.g. `title` max 150 chars, `content` max 5000 chars) and enum values (`category`, `status`, `priority`) must be strictly constrained to prevent Denial of Wallet.
6. **Path Variable Hardening**: Document IDs must conform to alphanumeric characters, dashes, and underscores up to 128 characters (`isValidId`).
7. **Connection Probe Safety**: The `/test/{docId}` path allows harmless server read checks to verify cloud connectivity.

## 2. The "Dirty Dozen" Payloads (Must be REJECTED)
1. **Unauthenticated Write**: An unauthenticated user attempts to create an item.
2. **Spoofed User ID**: An authenticated user with UID `user_A` submits an item with `userId: "user_B"`.
3. **Ghost Field (Shadow Injection)**: Item payload containing an unapproved field `{ ..., "isAdmin": true }`.
4. **Oversized Title**: An item with `title` exceeding 150 characters.
5. **Oversized Content**: An item with `content` exceeding 5000 characters.
6. **Invalid Category Enum**: An item specifying `category: "malicious_script"`.
7. **Invalid Status Enum**: An item specifying `status: "superadmin"`.
8. **Forged CreatedAt Timestamp**: A write where `createdAt` is a fixed string instead of server timestamp `request.time`.
9. **Provenance Mutation on Update**: An update modifying the immutable `userId` to transfer ownership.
10. **CreatedAt Tampering on Update**: An update modifying `createdAt`.
11. **Malicious ID Path Poisoning**: A write targeting document ID containing injection payload `../admin_bypass`.
12. **Cross-User Data Scraping**: A list query or get attempting to fetch another user's documents without matching `resource.data.userId == request.auth.uid`.

## 3. Test Runner Invariant Assertions
All 12 dirty payloads will trigger `PERMISSION_DENIED` errors from Firestore rules engine.
