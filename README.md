# airport-k8s — Microservicio Node.js con CI/CD Automatizado

Pipeline CI/CD completo con separación de responsabilidades:
GitHub Actions CI (validación en PR) + GitHub Actions CD (despliegue tras merge) + GitOps con Argo CD.
Seguridad integrada con SonarCloud y Snyk. Observabilidad con Prometheus y Grafana.
Desplegado en Azure AKS mediante Helm.

## Stack

| Capa | Herramienta |
|---|---|
| Runtime | Node.js 22 + TypeScript + Express |
| Contenedor | Docker + Docker Hub |
| CI | GitHub Actions — `ci.yml` |
| CD | GitHub Actions — `cd.yml` |
| Gestión de config | Helm Charts |
| Orquestación | Azure AKS |
| GitOps / CD | Argo CD |
| Calidad de código | ESLint + Prettier |
| Análisis estático | SonarCloud |
| Seguridad | Snyk (SCA + SAST) |
| Métricas | Prometheus |
| Dashboards | Grafana |

## Ejecución local

```bash
cd microservices       # Entrar al directorio del microservicio
npm ci                 # Instalar dependencias (usa package-lock.json)
npm run test:coverage  # Ejecutar tests unitarios con reporte de cobertura
npm run format:check   # Verificar formato con Prettier
npm run lint           # Análisis estático con ESLint
npm run build          # Compilar TypeScript a JavaScript
npm start              # Iniciar servidor en modo producción (puerto 3000)
```

## Flujo CI/CD

### CI — Integración Continua (`ci.yml`)

Se activa en cada `pull_request` a `main` (opened, synchronize, reopened).

```
PR abierto / actualizado
        │
        ├─────────────────────────────────────┐
        ▼                                     ▼
   validate                                  lint
   npm ci → tests + cobertura → build        Prettier check + ESLint
   sube artifact lcov.info                   max-warnings=12
        │ needs: validate                         │
        ▼                                         │
   sonar                                          │
   descarga lcov → fix paths → SonarCloud         │
   Quality Gate en el PR                          │
        │                                         │
        └──────────────────┬──────────────────────┘
                           │ (paralelo con sonar y lint)
                    ┌──────┘
                    ▼
                  snyk
                  SCA: dependencias (severity: high)
                  SAST: código fuente TypeScript
                    │
                    └─── needs: [validate, lint, sonar, snyk]
                                      │
                                      ▼
                               docker-build
                               Build imagen SIN push
                               Valida el artefacto antes del merge
```

El merge a `main` está bloqueado hasta que los 5 jobs estén en verde
(branch protection ruleset con required status checks).

### CD — Entrega Continua (`cd.yml`)

Se activa en cada `push` a `main` (tras el merge del PR).
Ignora cambios en `airport-k8s/values.yaml` para evitar bucles.

```
Merge a main
        │
        ├──────────────────────────────┐
        ▼                              ▼
   sonar-main                    snyk-monitor
   tests → lcov → SonarCloud     snyk monitor
   actualiza overall del         registra snapshot
   proyecto en rama main         para alertas futuras
        │                              │
        └──────────────┬───────────────┘
                       │ needs: [sonar-main, snyk-monitor]
                       ▼
                    docker
                    Genera IMAGE_TAG (SHA del merge commit)
                    Build + push a Docker Hub
                    Tags: :{SHA} y :latest
                    Expone IMAGE_TAG via job outputs
                       │ needs: docker
                       │ IMAGE_TAG compartido via outputs
                       ▼
                    gitops
                    Recupera IMAGE_TAG via job outputs
                    Actualiza airport-k8s/values.yaml
                    Commit + push a main [skip ci]
                       │
                       ▼
                    Argo CD
                    Detecta cambio en values.yaml
                    Sincroniza clúster AKS
                    Rolling update sin downtime
```

> **Por qué el IMAGE_TAG se genera en CD y no en CI:**
> CI corre en el commit del PR y CD corre en el merge commit —
> son SHA distintos. Si el tag se generara en CI, Docker Hub tendría
> la imagen con un SHA y `values.yaml` apuntaría a otro, rompiendo
> el despliegue en Argo CD. Al generarlo una sola vez en el job `docker`
> del CD y compartirlo via `job outputs`, ambos jobs usan siempre el mismo tag.

## Seguridad integrada

### ESLint + Prettier
Análisis estático y verificación de formato en cada PR. Configurado con
`eslint.config.mjs` (ESLint v9 + typescript-eslint flat config).

### SonarCloud
- **En CI** (`job sonar`): analiza el PR y reporta el Quality Gate directamente en GitHub.
- **En CD** (`job sonar-main`): analiza la rama main tras cada merge para actualizar
  el dashboard global con cobertura acumulada y tendencia histórica.

Dashboard: https://sonarcloud.io/dashboard?id=NicolasCifuentesB_microservice-kubernets-cicd

### Snyk
- **En CI** (`job snyk`): `snyk test` (SCA) + `snyk code test` (SAST) con `--severity-threshold=high`.
  Bloquea el merge si detecta vulnerabilidades críticas.
- **En CD** (`job snyk-monitor`): `snyk monitor` registra una snapshot de dependencias
  para recibir alertas automáticas ante nuevas vulnerabilidades en producción.

## Observabilidad

El microservicio expone métricas en formato Prometheus en `GET /metrics` (puerto 3000).

### Métricas disponibles

| Métrica | Tipo | Descripción |
|---|---|---|
| `airport_k8s_http_requests_total` | Counter | Total de requests por método, ruta y status code |
| `airport_k8s_http_request_duration_seconds` | Histogram | Duración de requests (percentiles p50/p95/p99) |
| `airport_k8s_active_connections_total` | Counter | Total de conexiones activas |
| `airport_k8s_process_cpu_seconds_total` | Counter | Tiempo de CPU del proceso Node.js |
| `airport_k8s_process_resident_memory_bytes` | Gauge | Memoria residente en bytes |

### Prometheus
Desplegado con `kube-prometheus-stack` en el namespace `monitoring`.
El `ServiceMonitor` en `airport-k8s/templates/servicemonitor.yaml` configura
el descubrimiento automático del endpoint `/metrics` cada 30 segundos.

```bash
# Acceder a la UI de Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```

### Grafana
Dashboard `airport-k8s` con paneles de HTTP requests, latencia, CPU, memoria y error rate.
Versionado en `monitoring/dashboards/airport-k8s.json` y cargado automáticamente
al clúster via ConfigMap con el label `grafana_dashboard: "1"`.

```bash
# Acceder a Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3001:80
# Usuario: admin
# Contraseña: kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

## Estructura del repositorio

```
microservice-kubernets-cicd/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Pipeline CI (PR): validate, lint, sonar, snyk, docker-build
│       └── cd.yml              # Pipeline CD (merge): sonar-main, snyk-monitor, docker, gitops
├── airport-k8s/                # Helm Chart para Kubernetes
│   ├── charts/
│   ├── templates/
│   │   ├── deployment.yaml     # Con anotaciones prometheus.io/scrape
│   │   ├── service.yaml        # Con label app y puerto http nombrado
│   │   ├── servicemonitor.yaml # Descubrimiento de métricas por Prometheus
│   │   └── grafana-dashboard.yaml  # ConfigMap con el dashboard versionado
│   ├── Chart.yaml
│   └── values.yaml             # Actualizado automáticamente por job gitops
├── microservices/              # Código fuente del microservicio
│   ├── src/
│   │   ├── metrics/
│   │   │   ├── metrics.ts              # Registry y métricas custom con prom-client
│   │   │   └── metrics.middleware.ts   # Middleware Express de instrumentación
│   │   └── routes/
│   │       └── metrics.routes.ts       # Endpoint GET /metrics
│   ├── coverage/
│   ├── Dockerfile
│   ├── eslint.config.mjs       # ESLint v9 flat config con typescript-eslint
│   ├── jest.config.ts
│   ├── nodemon.json
│   ├── package.json
│   ├── package-lock.json
│   ├── sonar-project.properties  # Configuración SonarCloud
│   └── tsconfig.json
├── monitoring/
│   └── dashboards/
│       └── airport-k8s.json    # Dashboard Grafana exportado y versionado
├── Jenkinsfile                 # Definición formal equivalente del pipeline (14 stages)
├── .gitignore
└── README.md
```

## Secretos requeridos (GitHub Secrets)

| Secret | Descripción |
|---|---|
| `DOCKER_USERNAME` | Usuario de Docker Hub |
| `DOCKER_PASSWORD` | Token de acceso de Docker Hub (no la contraseña) |
| `PAT_GITHUB` | Personal Access Token con permisos `repo` — usado por el job gitops para hacer push a `main` con bypass del ruleset |
| `SONAR_TOKEN` | Token de autenticación de SonarCloud |
| `SNYK_TOKEN` | Token de autenticación de Snyk |

## Branch Protection

El repositorio tiene configurado un ruleset sobre `main` con:

- **Require a pull request before merging** — bloquea push directo a `main`
- **Required status checks** — el merge está bloqueado hasta que pasen:
  - `validate`
  - `lint`
  - `sonar`
  - `snyk`
  - `docker-build`
- **Bypass list** — `Repository admin` para permitir el push del job gitops con `PAT_GITHUB`

## Jenkinsfile

El archivo `Jenkinsfile` en la raíz del repositorio es la representación formal
y equivalente del flujo CI/CD completo con 14 stages documentados, cada uno con
su correspondencia directa a los jobs de `ci.yml` y `cd.yml`.
No se ejecuta en producción pero sirve como documentación técnica del pipeline
y referencia para una eventual migración a Jenkins.