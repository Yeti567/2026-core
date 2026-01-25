/**
 * Authentication Utilities
 * 
 * Helpers for accessing user context and protecting routes.
 */

export {
  getServerUser,
  getServerUserOrRedirect,
  requireRole,
  requireAuth,
  requireAuthWithRole,
  isAdminRole,
  isSuperAdmin,
  hasMinimumRole,
  ROLE_HIERARCHY,
  type ServerUserContext,
  type AuthError,
} from './helpers';
