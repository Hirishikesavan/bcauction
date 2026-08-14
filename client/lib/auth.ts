// Authentication removed - stub exports for compatibility
export const AUTH_CONFIG = {
  redirects: {
    admin:      '/dashboard/admin',
    organizer:  '/dashboard/organizer',
    team_owner: '/dashboard/team-owner',
    viewer:     '/dashboard/viewer',
  } as const,
  publicPaths: ['/'],
};
