# User Authentication & Authorization Architecture

## Hierarchy (5 Levels)

| Level | Role | Permissions |
|-------|------|-------------|
| 0 | Master Admin | Full system access, manage all users |
| 1 | Safety Director | Same as admin, all site access |
| 2 | Project Manager | Own teams only, own projects |
| 3 | Foreman | Own crew only, submit JHAs |
| 4 | Field Worker | Self only, own JHAs |

## Database Schema

### Users Table
- `clerk_id` - Clerk auth ID
- `role` - One of 5 roles above 
- `reports_to` - Hierarchy chain
- `assigned_project_manager` - PM assignment

### Sites Table
- Site with assigned PM

### Site Assignments Table  
- Links users to sites

## Security Rules

1. **Role Verification** - Server-side ONLY, never trust frontend
2. **Data Access Control** - Hierarchical filtering by role
3. **API Protection** - Clerk middleware + DB role verification
4. **Row-Level Security** - PostgreSQL RLS policies
5. **Clerk Metadata Sync** - DB always wins on mismatch

## Critical Security

- NEVER trust frontend for role data
- Always verify against database
- Default to lowest permission (field_worker)
- Only admins can modify roles/hierarchy
