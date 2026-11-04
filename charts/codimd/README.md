# Local CodiMD Helm chart

This chart deploys CodiMD and a single PostgreSQL instance for **local testing only**.
By default both database and uploads use ephemeral storage; deleting/recreating Pods can lose data.
Do not use the sample credentials for a network-exposed deployment.

## Build image

The upstream image build uses its own Node 16 buildpack/runtime images and is not yet modernized.
From the repository root:

```sh
docker build -f deployments/Dockerfile \
  --build-arg RUNTIME=hackmdio/runtime:16.20.2-35fe7e39 \
  --build-arg BUILDPACK=hackmdio/buildpack:16.20.2-35fe7e39 \
  -t codimd-local:dev .
```

Load the image into your local Kubernetes cluster (e.g. `kind load docker-image codimd-local:dev`),
then:

```sh
helm upgrade --install codimd ./charts/codimd \
  --set sessionSecret='replace-with-a-long-random-secret' \
  --set database.password='local-only-password'
kubectl port-forward svc/codimd-codimd 3000:3000
```

Visit http://localhost:3000. For a persistent local environment, enable
`database.persistence.enabled` and `uploads.persistence.enabled` and ensure a
StorageClass exists. Credentials are stored in a Kubernetes Secret but are still
present in Helm release history. This is not a production-ready chart.

## Docker Compose alternative

Run `docker compose -f compose.local.yaml up --build` from the repository root.
The Compose setup uses named volumes for PostgreSQL and uploaded images and binds
the web port to localhost only. Use `docker compose -f compose.local.yaml down`
to stop; add `-v` only when you intend to delete local data.
