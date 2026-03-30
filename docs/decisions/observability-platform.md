# Observability Platform Decision

## Current State

The backend now emits structured request logs, structured rate-limit warnings, and aligned unhandled 5xx logs.

The app currently runs with:

- a small traffic profile
- GitHub Pages for the frontend
- Render for the backend
- no dedicated alerting or long-retention log platform yet

Render's current logging model is sufficient for the present scope:

- Render's dashboard supports log search and filtering, including HTTP request logs on Professional workspaces and higher
- retention depends on plan tier and is limited to 7, 14, or 30 days
- if longer retention is needed, Render supports log streaming to a TLS-enabled syslog provider

Managed Elastic and OpenSearch remain available later, but both add ongoing platform cost and operational surface area:

- Elastic Cloud Hosted starts at a real monthly floor for managed plans
- Amazon OpenSearch Service pricing adds persistent compute and storage costs, and the serverless path still carries a minimum OCU floor for the first collection

## Decision

Do not adopt Elastic or OpenSearch now.

Stay with:

- Render log search for short-horizon investigation
- the structured JSON fields already emitted by the backend
- optional syslog streaming later if retention or external alert routing becomes necessary

## Reason

This app does not currently justify a separate observability stack.

The present operational needs are narrower:

- identify repeated reset attempts
- identify repeated admin auth failures
- identify 5xx spikes
- trace a request with stable request metadata

Those needs are covered well enough by structured logs on Render today. Moving to Elastic or OpenSearch immediately would add cost and maintenance before the repo has proven that longer retention, cross-service querying, or advanced alerting is actually required.

## Revisit Trigger

Revisit this decision only if one or more of the following becomes true:

- operators need retention beyond Render's plan-based window
- log volume or incident response requires cross-service dashboards and richer alerting
- Render search/filtering becomes insufficient for request-level investigation
- the team adopts a broader operational stack that already standardizes on Elastic, OpenSearch, or another hosted logging provider

## References

- [Render logging docs](https://render.com/docs/logging)
- [Render log streams docs](https://render.com/docs/log-streams)
- [Elastic Cloud Hosted pricing](https://www.elastic.co/pricing/cloud-hosted)
- [Amazon OpenSearch Service pricing](https://aws.amazon.com/opensearch-service/pricing/)
