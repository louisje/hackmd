# CodiMD Helm Chart

Deploy CodiMD to Kubernetes using an existing PostgreSQL database and a hostPath-backed PV/PVC for uploads. No PostgreSQL instance is deployed by this chart.

## Build image

```sh
docker build -f deployments/Dockerfile \
  --build-arg RUNTIME=hackmdio/runtime:16.20.2-35fe7e39 \
  --build-arg BUILDPACK=hackmdio/buildpack:16.20.2-35fe7e39 \
  -t codimd-local:dev .
```

Load the image into your Kubernetes cluster, then deploy:

```sh
helm upgrade --install codimd ./charts/codimd --namespace codimd --create-namespace
```

Configure `database.host`, `database.port`, `database.name`, `database.user`, and `database.password` in values or a private override file. The sample password is not suitable for production. Replace `sessionSecret` before exposing the service. Helm release metadata may retain supplied secrets.

Uploads use `uploads.persistence.hostPath` on the Kubernetes node and mount into `/home/hackmd/app/public/uploads` in the container. The PV uses `Retain`; hostPath is node-local, so schedule the Pod on the node where this path exists. Ensure the directory is writable by the CodiMD process.
