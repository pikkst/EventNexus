# Incident Report: Exposed Meta Access Tokens

## Summary
Multiple Meta/Facebook/Instagram access tokens and related credentials were identified in repository files and scripts.

## Exposure Window
The repository contained token values in SQL scripts, shell helpers, and documentation. These values should be treated as compromised.

## Actions Taken
- Replaced exposed token values with non-sensitive placeholders.
- Added this incident report to document the issue and required follow-up.
- Prepared a dedicated incident branch for remediation and review.

## Required Follow-Up
1. Revoke all exposed tokens in Meta Business/App settings.
2. Rotate the Facebook app secret and any related client secrets.
3. Review Meta security logs for suspicious use.
4. Rewrite repository history and force-push after coordinating with collaborators.
5. Re-clone and reconfigure any downstream integrations.

## Notes
No credential values should be committed to source control. Secrets must be stored only in backend-managed secret storage and injected at runtime.
