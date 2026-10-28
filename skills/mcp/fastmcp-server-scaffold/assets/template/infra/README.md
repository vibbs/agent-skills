# Infrastructure

Infrastructure as code for this service lives here: Bicep, Terraform, CloudFormation,
whatever the target is. Commit non-secret parameter files; pass secrets at deploy time.

This folder is intentionally empty until there is something real to put in it. A stub
that *claims* to provision something is worse than an empty folder.

What a deployment needs: a container runtime for the image built from `Dockerfile`, an
HTTPS endpoint, the environment variables in `.env.example` (secrets from a secret store),
and an alert on repeated container restarts: a crash loop is otherwise invisible.
