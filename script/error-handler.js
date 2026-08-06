/* ============================================
   ERROR-HANDLER.JS - ETCH Error Handling System
   ============================================ */

const EtchErrorHandler = (function () {
    'use strict';

    // ============================================
    // ERROR CODE MAPPINGS
    // ============================================
    const ERROR_CODES = {
        // Authentication Errors
        AUTH_INVALID_CREDENTIALS: {
            message: 'The email or password you entered is incorrect. Please try again.',
            action: 'highlight_password'
        },
        AUTH_EMAIL_NOT_VERIFIED: {
            message: 'Please verify your email address before signing in.',
            action: 'show_resend'
        },
        AUTH_SESSION_EXPIRED: {
            message: 'Your session has expired. Please sign in again.',
            action: 'redirect_login'
        },
        AUTH_ACCOUNT_DISABLED: {
            message: 'This account has been disabled. Please contact support if you believe this is a mistake.',
            action: null
        },
        AUTH_TOO_MANY_ATTEMPTS: {
            message: 'Too many login attempts. Please wait a few minutes before trying again.',
            action: null
        },
        AUTH_PASSWORD_TOO_WEAK: {
            message: 'Your password does not meet our security requirements.',
            action: null
        },
        AUTH_PASSWORD_MISMATCH: {
            message: 'The passwords do not match.',
            action: null
        },
        AUTH_EMAIL_ALREADY_EXISTS: {
            message: 'An account with this email already exists.',
            action: null
        },
        AUTH_INVALID_OTP: {
            message: 'The verification code is incorrect or has expired.',
            action: null
        },
        AUTH_OAUTH_FAILED: {
            message: 'We couldn\'t complete the sign-in process. Please try again.',
            action: null
        },

        // Authorization Errors
        ACCESS_DENIED: {
            message: 'You don\'t have permission to perform this action.',
            action: null
        },
        CREATOR_ONLY: {
            message: 'This feature is only available to verified creators.',
            action: null
        },
        BUYER_ONLY: {
            message: 'This feature is only available to buyers.',
            action: null
        },
        ADMIN_ONLY: {
            message: 'You don\'t have permission to access this page.',
            action: null
        },

        // Validation Errors
        VALIDATION_REQUIRED_FIELD: {
            message: 'This field is required.',
            action: null
        },
        VALIDATION_INVALID_EMAIL: {
            message: 'Please enter a valid email address.',
            action: null
        },
        VALIDATION_INVALID_URL: {
            message: 'Please enter a valid website address.',
            action: null
        },
        VALIDATION_INVALID_PHONE: {
            message: 'Please enter a valid phone number.',
            action: null
        },
        VALIDATION_INVALID_DATE: {
            message: 'Please select a valid date.',
            action: null
        },
        VALIDATION_INVALID_FORMAT: {
            message: 'The information entered is not in the correct format.',
            action: null
        },
        VALIDATION_TOO_SHORT: {
            message: 'This value is too short.',
            action: null
        },
        VALIDATION_TOO_LONG: {
            message: 'This value exceeds the maximum allowed length.',
            action: null
        },

        // User Account Errors
        USER_NOT_FOUND: {
            message: 'We couldn\'t find the requested account.',
            action: null
        },
        PROFILE_NOT_COMPLETED: {
            message: 'Please complete your profile before continuing.',
            action: null
        },
        PROFILE_UPDATE_FAILED: {
            message: 'We couldn\'t update your profile right now. Please try again.',
            action: null
        },

        // Marketplace Errors
        WORK_NOT_FOUND: {
            message: 'The requested creative work could not be found.',
            action: null
        },
        WORK_ALREADY_EXISTS: {
            message: 'A work with this title already exists.',
            action: null
        },
        WORK_ARCHIVED: {
            message: 'This creative work is no longer available.',
            action: null
        },
        WORK_PRIVATE: {
            message: 'This work is currently private.',
            action: null
        },
        WORK_UNAVAILABLE: {
            message: 'This work is no longer available.',
            action: null
        },

        // Creator Errors
        CREATOR_NOT_VERIFIED: {
            message: 'Your creator account must be verified before publishing work.',
            action: null
        },
        CREATOR_VERIFICATION_PENDING: {
            message: 'Your verification request is still under review.',
            action: null
        },
        CREATOR_VERIFICATION_REJECTED: {
            message: 'Your verification request was not approved. Please review the feedback and try again.',
            action: null
        },

        // Licensing Errors
        LICENSE_ALREADY_REQUESTED: {
            message: 'You\'ve already submitted a licensing request for this work.',
            action: null
        },
        LICENSE_NOT_AVAILABLE: {
            message: 'This work is not currently available for licensing.',
            action: null
        },
        LICENSE_EXPIRED: {
            message: 'This licensing offer has expired.',
            action: null
        },
        LICENSE_REQUEST_FAILED: {
            message: 'We couldn\'t submit your request right now. Please try again.',
            action: null
        },

        // File Upload Errors
        FILE_TOO_LARGE: {
            message: 'This file exceeds the maximum upload size.',
            action: null
        },
        FILE_UNSUPPORTED_TYPE: {
            message: 'This file type is not supported.',
            action: null
        },
        FILE_UPLOAD_FAILED: {
            message: 'We couldn\'t upload your file. Please try again.',
            action: null
        },
        FILE_CORRUPTED: {
            message: 'The selected file appears to be corrupted.',
            action: null
        },
        FILE_DUPLICATE: {
            message: 'This file has already been uploaded.',
            action: null
        },

        // Payment Errors
        PAYMENT_FAILED: {
            message: 'We couldn\'t process your payment.',
            action: null
        },
        PAYMENT_CANCELLED: {
            message: 'Your payment was cancelled.',
            action: null
        },
        PAYMENT_ALREADY_COMPLETED: {
            message: 'This payment has already been completed.',
            action: null
        },
        PAYMENT_METHOD_DECLINED: {
            message: 'Your payment method was declined.',
            action: null
        },

        // Search Errors
        SEARCH_NO_RESULTS: {
            message: 'No results matched your search.',
            action: 'show_suggestions'
        },
        FILTER_NO_RESULTS: {
            message: 'No items match the selected filters.',
            action: null
        },

        // Notification Errors
        NOTIFICATION_NOT_FOUND: {
            message: 'This notification no longer exists.',
            action: null
        },
        MESSAGE_SEND_FAILED: {
            message: 'We couldn\'t send your message.',
            action: null
        },

        // Network Errors
        NETWORK_OFFLINE: {
            message: 'It looks like you\'re offline. Please check your internet connection.',
            action: null
        },
        NETWORK_TIMEOUT: {
            message: 'The request took too long. Please try again.',
            action: null
        },
        NETWORK_CONNECTION_FAILED: {
            message: 'We couldn\'t connect to the server.',
            action: null
        },

        // Server Errors
        SERVER_ERROR: {
            message: 'Something went wrong on our end. Please try again in a moment.',
            action: null
        },
        SERVICE_UNAVAILABLE: {
            message: 'The service is temporarily unavailable. Please try again later.',
            action: null
        },
        MAINTENANCE_MODE: {
            message: 'Etch is currently undergoing scheduled maintenance. We\'ll be back shortly.',
            action: null
        },
        DATABASE_ERROR: {
            message: 'We couldn\'t complete your request due to a temporary system issue.',
            action: null
        },

        // Rate Limiting
        TOO_MANY_REQUESTS: {
            message: 'You\'re making requests too quickly. Please slow down and try again.',
            action: null
        },

        // Unknown Error
        UNKNOWN_ERROR: {
            message: 'Something unexpected happened. Please try again.',
            action: null
        }
    };

    // ============================================
    // SUPABASE ERROR MAPPING
    // ============================================
    const SUPABASE_ERROR_MAP = {
        'Invalid login credentials': 'AUTH_INVALID_CREDENTIALS',
        'Email not confirmed': 'AUTH_EMAIL_NOT_VERIFIED',
        'User already registered': 'AUTH_EMAIL_ALREADY_EXISTS',
        'Password should be at least 6 characters': 'AUTH_PASSWORD_TOO_WEAK',
        'OTP expired': 'AUTH_INVALID_OTP',
        'Token expired': 'AUTH_SESSION_EXPIRED',
        'Refresh Token Not Found': 'AUTH_SESSION_EXPIRED',
        'User not found': 'USER_NOT_FOUND',
        'Too many requests': 'AUTH_TOO_MANY_ATTEMPTS',
        'Rate limit exceeded': 'AUTH_TOO_MANY_ATTEMPTS',
        'Email address already exists': 'AUTH_EMAIL_ALREADY_EXISTS',
        'Invalid email': 'VALIDATION_INVALID_EMAIL',
        'Password mismatch': 'AUTH_PASSWORD_MISMATCH',
    };

    // ============================================
    // ERROR MAPPING FUNCTION
    // ============================================
    function mapError(error) {
        // If it's already an Etch error code
        if (ERROR_CODES[error]) {
            return {
                code: error,
                message: ERROR_CODES[error].message,
                action: ERROR_CODES[error].action
            };
        }

        // If it's a Supabase error, try to map it
        if (error.message && SUPABASE_ERROR_MAP[error.message]) {
            const etchErrorCode = SUPABASE_ERROR_MAP[error.message];
            return {
                code: etchErrorCode,
                message: ERROR_CODES[etchErrorCode].message,
                action: ERROR_CODES[etchErrorCode].action
            };
        }

        // Check for specific error patterns
        if (error.message) {
            const lowerMessage = error.message.toLowerCase();

            if (lowerMessage.includes('invalid login') || lowerMessage.includes('invalid credentials')) {
                return {
                    code: 'AUTH_INVALID_CREDENTIALS',
                    message: ERROR_CODES.AUTH_INVALID_CREDENTIALS.message,
                    action: ERROR_CODES.AUTH_INVALID_CREDENTIALS.action
                };
            }

            if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('not verified')) {
                return {
                    code: 'AUTH_EMAIL_NOT_VERIFIED',
                    message: ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED.message,
                    action: ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED.action
                };
            }

            if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
                return {
                    code: 'AUTH_EMAIL_ALREADY_EXISTS',
                    message: ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS.message,
                    action: ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS.action
                };
            }

            if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
                return {
                    code: 'AUTH_PASSWORD_TOO_WEAK',
                    message: ERROR_CODES.AUTH_PASSWORD_TOO_WEAK.message,
                    action: ERROR_CODES.AUTH_PASSWORD_TOO_WEAK.action
                };
            }

            if (lowerMessage.includes('otp') || lowerMessage.includes('verification code')) {
                return {
                    code: 'AUTH_INVALID_OTP',
                    message: ERROR_CODES.AUTH_INVALID_OTP.message,
                    action: ERROR_CODES.AUTH_INVALID_OTP.action
                };
            }

            if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
                return {
                    code: 'AUTH_TOO_MANY_ATTEMPTS',
                    message: ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS.message,
                    action: ERROR_CODES.AUTH_TOO_MANY_ATTEMPTS.action
                };
            }

            if (lowerMessage.includes('network') || lowerMessage.includes('offline')) {
                return {
                    code: 'NETWORK_OFFLINE',
                    message: ERROR_CODES.NETWORK_OFFLINE.message,
                    action: ERROR_CODES.NETWORK_OFFLINE.action
                };
            }

            if (lowerMessage.includes('timeout')) {
                return {
                    code: 'NETWORK_TIMEOUT',
                    message: ERROR_CODES.NETWORK_TIMEOUT.message,
                    action: ERROR_CODES.NETWORK_TIMEOUT.action
                };
            }
        }

        // Default to unknown error
        return {
            code: 'UNKNOWN_ERROR',
            message: ERROR_CODES.UNKNOWN_ERROR.message,
            action: ERROR_CODES.UNKNOWN_ERROR.action
        };
    }

    // ============================================
    // DISPLAY ERROR
    // ============================================
    function displayError(error, errorElementId) {
        const mappedError = mapError(error);

        // Log technical details internally
        console.error('Error Code:', mappedError.code);
        console.error('Original Error:', error);
        console.error('User Message:', mappedError.message);

        // Display user-friendly message
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) {
            errorEl.textContent = mappedError.message;
            errorEl.classList.remove('hidden');
        }

        // Execute action if defined
        if (mappedError.action) {
            executeAction(mappedError.action, errorEl);
        }

        return mappedError;
    }

    // ============================================
    // EXECUTE ACTION
    // ============================================
    function executeAction(action, errorElement) {
        switch (action) {
            case 'highlight_password':
                const passwordInput = document.querySelector('input[name="password"]');
                if (passwordInput) {
                    passwordInput.focus();
                    passwordInput.classList.add('border-error', 'ring-2', 'ring-error/20');
                    setTimeout(() => {
                        passwordInput.classList.remove('border-error', 'ring-2', 'ring-error/20');
                    }, 3000);
                }
                break;

            case 'redirect_login':
                setTimeout(() => {
                    window.location.href = '../auth/signin.html';
                }, 2000);
                break;

            case 'show_resend':
                // Show resend verification button if it exists
                const resendBtn = document.getElementById('resendVerificationBtn');
                if (resendBtn) {
                    resendBtn.classList.remove('hidden');
                }
                break;

            case 'show_suggestions':
                // Show search suggestions
                const suggestionsEl = document.getElementById('searchSuggestions');
                if (suggestionsEl) {
                    suggestionsEl.classList.remove('hidden');
                }
                break;

            default:
                break;
        }
    }

    // ============================================
    // DISPLAY SUCCESS
    // ============================================
    function displaySuccess(message, successElementId) {
        const successEl = document.getElementById(successElementId);
        if (successEl) {
            successEl.textContent = message;
            successEl.classList.remove('hidden');
        }
    }

    // ============================================
    // CLEAR MESSAGES
    // ============================================
    function clearMessages(errorElementId, successElementId) {
        if (errorElementId) {
            const errorEl = document.getElementById(errorElementId);
            if (errorEl) errorEl.classList.add('hidden');
        }
        if (successElementId) {
            const successEl = document.getElementById(successElementId);
            if (successEl) successEl.classList.add('hidden');
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        mapError,
        displayError,
        displaySuccess,
        clearMessages,
        ERROR_CODES
    };
})();