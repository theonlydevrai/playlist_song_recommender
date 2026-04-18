# DevOps Implementation - Final Production-Style Documentation

Date: 2026-04-19
Status: complete
Scope: full repository coverage with implementation behavior, operational usage, deployment lifecycle, and hidden coupling analysis.

## 1. Objective

This file documents how this project is implemented end-to-end from application code to deployment automation and observability.

Primary goals:
- explain exactly how each part works.
- show how to run, verify, and scale the system.
- list real coupling points and operational gotchas.
- provide complete file-level indexing for maintainers.

## 2. Architecture Summary

Application stack:
- frontend: React + Vite + Tailwind + Axios.
- backend: Node.js + Express + Prometheus metrics.
- ml-service: Flask + scikit-learn KMeans + Prometheus metrics.

DevOps stack:
- containerization: Docker + Docker Compose.
- orchestration: Kubernetes on Minikube.
- deployment automation: Ansible hash-based idempotent playbook.
- ci/cd: Jenkins pipeline.
- code quality: SonarQube scanner config.
- observability: Prometheus + Grafana + kube-state-metrics.
- elasticity: Kubernetes HPA via metrics-server.

## 3. Service Interaction Contract

### 3.1 User-facing path

1. Browser loads frontend.
2. Frontend submits playlist URL to backend.
3. Backend fetches Spotify metadata/tracks and enriches features.
4. User selects optional seed tracks and mood data.
5. Backend invokes Gemini and ML pipeline.
6. Backend responds with recommendations.
7. Frontend renders recommendations and provides export options.

### 3.2 Service-to-service path

- frontend to backend:
  - dev mode: Vite proxy to localhost:3001.
  - cluster mode: Nginx /api proxy to backend-service:3001.
- backend to ml-service:
  - via ML_SERVICE_URL.
- backend to Spotify and Gemini:
  - external API calls with secret credentials.
- Prometheus to services:
  - scrape /metrics endpoints.

## 4. Environment and Configuration Contracts

### 4.1 Required secret keys

- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET
- GEMINI_API_KEY

Secret source for Kubernetes deploy path:
- root .env read by ansible/deploy.yml.

### 4.2 Non-secret runtime config

From k8s/configmap.yaml:
- backend-config:
  - PORT
  - NODE_ENV
  - FRONTEND_URL
  - ML_SERVICE_URL
- ml-config:
  - PORT
  - DEBUG

## 5. Frontend Implementation Details

Main implementation file:
- frontend/src/App.jsx

Key behaviors:
- two-stage flow:
  - playlist analysis.
  - recommendation generation.
- mood modes:
  - single mood text.
  - mood journey list with ordering controls.
- optional song pinning for style anchoring.
- recommendation result view with:
  - score/duration/count summary.
  - per-track rows.
  - copy names and URIs actions.
- loading overlays and error surfaces.

Build/runtime pipeline:
- vite.config.js controls dev server and API proxy.
- tailwind/postcss generate utility-driven styling.
- Dockerfile produces static build and serves it via Nginx.
- nginx/default.conf.template proxies /api and serves /healthz, /metrics.

## 6. Backend Implementation Details

Bootstrap file:
- backend/src/index.js

Core concerns:
- security middleware with helmet.
- rate limiting on /api paths.
- CORS origin bound to FRONTEND_URL.
- metrics instrumentation with backend_http_requests_total.
- route mounts:
  - /api/playlists
  - /api/recommendations
- /health and /metrics endpoint exposure.

Playlist workflow route:
- backend/src/routes/playlists.js
- validates playlist URL.
- fetches Spotify playlist and track data.
- enriches with audio features and artist genres.
- caches result in in-memory playlistCache.
- provides demo fallback payload when Spotify restriction path is hit.

Recommendation route:
- backend/src/routes/recommendations.js
- validates mood payload and duration.
- requires preloaded playlist in cache.
- single mood path:
  - Gemini analyzeMood.
  - mlService ruleBasedRecommendations.
- mood transition path:
  - Gemini analyzeMoodTransitions.
  - mlService moodTransitionRecommendations.

Service adapters:
- spotifyService.js: token caching, API pagination, enrichment.
- geminiService.js: prompt orchestration and fallback parsing.
- mlService.js: python service bridge + JS fallback recommendation logic.

## 7. ML Service Implementation Details

File:
- ml-service/app.py

ML strategy:
- weighted features map and mood definitions.
- classify_mood matches track features to mood ranges.
- cluster_tracks uses:
  - feature extraction.
  - StandardScaler.
  - KMeans clustering.
- get_recommendations scores tracks by:
  - category match.
  - energy and valence proximity.
  - danceability preference bonus.
  - artist diversity cap.
  - target duration fit with tolerance.

API endpoints:
- GET /health
- GET /metrics
- POST /cluster
- POST /recommend
- POST /classify

## 8. Kubernetes Deployment Implementation

Namespace:
- k8s/namespace.yaml

App deployments and services:
- k8s/backend.yaml
- k8s/frontend.yaml
- k8s/ml-service.yaml

Autoscaling:
- k8s/hpa.yaml
- backend: 1..3 replicas, cpu target 60.
- ml-service: 2..4 replicas, cpu target 50.

Operational hardening included:
- readiness/liveness probes.
- rolling update strategy.
- resource requests/limits.
- frontend initContainer waits for backend DNS to avoid startup race failures.

## 9. Observability Implementation

Prometheus:
- monitoring/prometheus.yaml
- scrape targets:
  - backend-service /metrics
  - ml-service /metrics
  - frontend-service /metrics
  - kube-state-metrics /metrics
- alert rules:
  - PodDown
  - HighCPU

kube-state-metrics:
- monitoring/kube-state-metrics.yaml
- includes ServiceAccount + ClusterRole + ClusterRoleBinding.
- exports pod/deployment/hpa state metrics.

Grafana:
- monitoring/grafana.yaml
- datasource and dashboard provisioning via ConfigMaps.
- dashboard includes CPU, request rate, memory, and pod count panels.

## 10. Ansible Automation Implementation

Main file:
- ansible/deploy.yml

Flow:
1. check/recover minikube health.
2. ensure metrics-server enabled.
3. calculate deployment fingerprint.
4. compare with previous hash.
5. if drift detected:
   - build images in minikube Docker daemon.
   - create/update spotify-secrets from root .env.
   - apply app and monitoring manifests.
   - restart deployments and wait for rollouts.
   - restart prometheus and wait.
   - persist hash.
6. print service endpoints.

Design value:
- idempotent deploy with deterministic drift detection.

## 11. CI/CD Implementation

Jenkins pipeline stages:
- checkout.
- install dependencies for frontend/backend/ml-service.
- local quality gate checks.
- SonarQube analysis.
- Docker image build in minikube docker env.
- Ansible deploy.
- post-deploy smoke checks.

Pipeline resilience behavior:
- selected stages skip gracefully if required tools are absent in runner.

## 12. Operational Scripts

load generator:
- scripts/load-hpa.sh
- creates synthetic cluster payload and sends concurrent POST requests to /cluster.

WSL host bridge:
- scripts/port-forward.sh
- binds service forwards to 0.0.0.0 for Windows browser access.

demo helper:
- scripts/demo-commands.md
- command blocks for deploy, verification, autoscaling, and observability checks.

## 13. Before and After Operational Scenarios

### 13.1 Deploy run

Before:
- stale pods/config or missing workloads possible.

Command:
- ansible-playbook -i ansible/inventory.ini ansible/deploy.yml

After:
- workloads converged to desired state.
- services listed with stable endpoints.
- rollouts completed.

### 13.2 HPA demo run

Before:
- baseline replicas near min.

Command:
- ./scripts/load-hpa.sh "http://$(minikube ip):30002/cluster" 300 30
- kubectl get hpa -n spotify-recommender

After:
- ml-service CPU rises and replicas scale up toward max.

### 13.3 Self-healing run

Before:
- deployment pod running.

Command:
- kubectl delete pod -n spotify-recommender -l app=backend --grace-period=0 --force

After:
- replacement pod created by deployment controller.
