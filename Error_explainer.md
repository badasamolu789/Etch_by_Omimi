# ETCH BY OMIMI

# Frontend Error Handling Specification

## UI Error Codes, Messages & Implementation Guide

## Overview

This document defines the standard error handling system for the Etch platform.

The objective is to ensure that every error presented to users is:

* Human-friendly
* Consistent across the application
* Actionable
* Easy for developers to map to backend responses
* Suitable for Supabase Authentication and a JavaScript/Node backend

**Important Principles**

* Never expose raw backend errors directly to users.
* Log technical details internally (console, monitoring, or logging service).
* Show clear, non-technical messages in the UI.
* Every API response should include an `errorCode` when an operation fails.
* The frontend should rely on `errorCode`, not raw error messages, to determine the UI response.

---

# Standard Error Response Format

```json
{
  "success": false,
  "errorCode": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid login credentials.",
  "details": {},
  "timestamp": "2026-07-24T12:30:00Z"
}
```

The frontend should switch on `errorCode` and display the corresponding UI message.

---

# Error Categories

* Authentication
* Authorization
* Validation
* User Account
* Marketplace
* Creator
* Licensing
* File Upload
* Payments
* Notifications
* Search
* Network
* Server
* Unknown Errors

---

# AUTHENTICATION ERRORS

## AUTH_INVALID_CREDENTIALS

**HTTP**
401

**UI Message**

"The email or password you entered is incorrect. Please try again."

Action:

* Highlight password field
* Shake form (optional)

---

## AUTH_EMAIL_NOT_VERIFIED

401

Message

"Please verify your email address before signing in."

Action

Show "Resend Verification Email"

---

## AUTH_SESSION_EXPIRED

401

Message

"Your session has expired. Please sign in again."

Action

Redirect to login

---

## AUTH_ACCOUNT_DISABLED

403

Message

"This account has been disabled. Please contact support if you believe this is a mistake."

---

## AUTH_TOO_MANY_ATTEMPTS

429

Message

"Too many login attempts. Please wait a few minutes before trying again."

---

## AUTH_PASSWORD_TOO_WEAK

400

Message

"Your password does not meet our security requirements."

---

## AUTH_PASSWORD_MISMATCH

400

Message

"The passwords do not match."

---

## AUTH_EMAIL_ALREADY_EXISTS

409

Message

"An account with this email already exists."

---

## AUTH_INVALID_OTP

400

Message

"The verification code is incorrect or has expired."

---

## AUTH_OAUTH_FAILED

400

Message

"We couldn't complete the sign-in process. Please try again."

---

# AUTHORIZATION ERRORS

## ACCESS_DENIED

403

Message

"You don't have permission to perform this action."

---

## CREATOR_ONLY

403

Message

"This feature is only available to verified creators."

---

## BUYER_ONLY

403

Message

"This feature is only available to buyers."

---

## ADMIN_ONLY

403

Message

"You don't have permission to access this page."

---

# VALIDATION ERRORS

## VALIDATION_REQUIRED_FIELD

400

Message

"This field is required."

---

## VALIDATION_INVALID_EMAIL

400

Message

"Please enter a valid email address."

---

## VALIDATION_INVALID_URL

400

Message

"Please enter a valid website address."

---

## VALIDATION_INVALID_PHONE

400

Message

"Please enter a valid phone number."

---

## VALIDATION_INVALID_DATE

400

Message

"Please select a valid date."

---

## VALIDATION_INVALID_FORMAT

400

Message

"The information entered is not in the correct format."

---

## VALIDATION_TOO_SHORT

400

Message

"This value is too short."

---

## VALIDATION_TOO_LONG

400

Message

"This value exceeds the maximum allowed length."

---

# USER ACCOUNT

## USER_NOT_FOUND

404

Message

"We couldn't find the requested account."

---

## PROFILE_NOT_COMPLETED

400

Message

"Please complete your profile before continuing."

---

## PROFILE_UPDATE_FAILED

500

Message

"We couldn't update your profile right now. Please try again."

---

# MARKETPLACE

## WORK_NOT_FOUND

404

Message

"The requested creative work could not be found."

---

## WORK_ALREADY_EXISTS

409

Message

"A work with this title already exists."

---

## WORK_ARCHIVED

410

Message

"This creative work is no longer available."

---

## WORK_PRIVATE

403

Message

"This work is currently private."

---

## WORK_UNAVAILABLE

404

Message

"This work is no longer available."

---

# CREATOR ERRORS

## CREATOR_NOT_VERIFIED

403

Message

"Your creator account must be verified before publishing work."

---

## CREATOR_VERIFICATION_PENDING

403

Message

"Your verification request is still under review."

---

## CREATOR_VERIFICATION_REJECTED

403

Message

"Your verification request was not approved. Please review the feedback and try again."

---

# LICENSING

## LICENSE_ALREADY_REQUESTED

409

Message

"You've already submitted a licensing request for this work."

---

## LICENSE_NOT_AVAILABLE

403

Message

"This work is not currently available for licensing."

---

## LICENSE_EXPIRED

410

Message

"This licensing offer has expired."

---

## LICENSE_REQUEST_FAILED

500

Message

"We couldn't submit your request right now. Please try again."

---

# FILE UPLOAD

## FILE_TOO_LARGE

413

Message

"This file exceeds the maximum upload size."

---

## FILE_UNSUPPORTED_TYPE

415

Message

"This file type is not supported."

---

## FILE_UPLOAD_FAILED

500

Message

"We couldn't upload your file. Please try again."

---

## FILE_CORRUPTED

400

Message

"The selected file appears to be corrupted."

---

## FILE_DUPLICATE

409

Message

"This file has already been uploaded."

---

# PAYMENTS

## PAYMENT_FAILED

402

Message

"We couldn't process your payment."

---

## PAYMENT_CANCELLED

400

Message

"Your payment was cancelled."

---

## PAYMENT_ALREADY_COMPLETED

409

Message

"This payment has already been completed."

---

## PAYMENT_METHOD_DECLINED

402

Message

"Your payment method was declined."

---

# SEARCH

## SEARCH_NO_RESULTS

404

Message

"No results matched your search."

UI Action

Display helpful suggestions instead of an empty page.

---

## FILTER_NO_RESULTS

404

Message

"No items match the selected filters."

---

# NOTIFICATIONS

## NOTIFICATION_NOT_FOUND

404

Message

"This notification no longer exists."

---

## MESSAGE_SEND_FAILED

500

Message

"We couldn't send your message."

---

# NETWORK ERRORS

## NETWORK_OFFLINE

0

Message

"It looks like you're offline. Please check your internet connection."

---

## NETWORK_TIMEOUT

408

Message

"The request took too long. Please try again."

---

## NETWORK_CONNECTION_FAILED

503

Message

"We couldn't connect to the server."

---

# SERVER ERRORS

## SERVER_ERROR

500

Message

"Something went wrong on our end. Please try again in a moment."

---

## SERVICE_UNAVAILABLE

503

Message

"The service is temporarily unavailable. Please try again later."

---

## MAINTENANCE_MODE

503

Message

"Etch is currently undergoing scheduled maintenance. We'll be back shortly."

---

## DATABASE_ERROR

500

Message

"We couldn't complete your request due to a temporary system issue."

---

# RATE LIMITING

## TOO_MANY_REQUESTS

429

Message

"You're making requests too quickly. Please slow down and try again."

---

# UNKNOWN ERROR

## UNKNOWN_ERROR

500

Message

"Something unexpected happened. Please try again."

Fallback

Every uncaught exception should resolve to this error code.

---

# Empty State Messages (Not Errors)

These are not failures and should use friendly illustrations.

## EMPTY_MARKETPLACE

"No creative works have been published yet."

---

## EMPTY_COLLECTION

"This collection is currently empty."

---

## EMPTY_SAVED_WORKS

"You haven't saved any creative works yet."

---

## EMPTY_NOTIFICATIONS

"You're all caught up."

---

## EMPTY_MESSAGES

"No conversations yet."

---

## EMPTY_DASHBOARD

"Your dashboard will begin to populate as you start using Etch."

---

# Success Messages

## SUCCESS_PROFILE_UPDATED

"Your profile has been updated successfully."

---

## SUCCESS_WORK_PUBLISHED

"Your creative work has been published."

---

## SUCCESS_LICENSE_REQUEST

"Your licensing request has been sent."

---

## SUCCESS_PASSWORD_RESET

"Your password has been changed successfully."

---

## SUCCESS_EMAIL_VERIFIED

"Your email has been verified."

---

## SUCCESS_UPLOAD

"Your files have been uploaded successfully."

---

# Supabase Authentication Error Mapping

When using Supabase Auth, map common authentication errors to the standardized Etch error codes before displaying them in the UI.

| Supabase Error                  | Etch Error Code           |
| ------------------------------- | ------------------------- |
| Invalid login credentials       | AUTH_INVALID_CREDENTIALS  |
| Email not confirmed             | AUTH_EMAIL_NOT_VERIFIED   |
| User already registered         | AUTH_EMAIL_ALREADY_EXISTS |
| Password should be at least ... | AUTH_PASSWORD_TOO_WEAK    |
| OTP expired                     | AUTH_INVALID_OTP          |
| Token expired                   | AUTH_SESSION_EXPIRED      |
| Refresh Token Not Found         | AUTH_SESSION_EXPIRED      |
| User not found                  | USER_NOT_FOUND            |
| Too many requests               | AUTH_TOO_MANY_ATTEMPTS    |

The frontend should never display Supabase's raw error strings directly. Instead, translate them into the corresponding Etch `errorCode` and present the standardized, user-friendly message defined in this document. This keeps the user experience consistent even if backend providers or internal error messages change.
