# airport-k8s — Microservicio Node.js con CI/CD Automatizado

Pipeline CI/CD completo con separación de responsabilidades:
GitHub Actions CI (validación en PR) + GitHub Actions CD (despliegue tras merge) + GitOps con Argo CD.
Desplegado en Azure AKS mediante Helm.

## Stack

| Capa             | Herramienta                    |
|------------------|--------------------------------|
| Runtime          | Node.js 22 + TypeScript + Express |
| Contenedor       | Docker + Docker Hub            |
| CI               | GitHub Actions — `ci.yml`      |
| CD               | GitHub Actions — `cd.yml`      |
| Gestión de config| Helm Charts                    |
| Orquestación     | Azure AKS                      |
| GitOps / CD      | Argo CD                        |

## Ejecución local

```bash
cd microservices       # Entrar al directorio del microservicio
npm ci                 # Instalar dependencias (usa package-lock.json)
npm run test:coverage  # Ejecutar tests unitarios con reporte de cobertura
npm run build          # Compilar TypeScript a JavaScript
npm start              # Iniciar servidor en modo producción
```

## Flujo CI/CD

### CI — Integración Continua (`ci.yml`)

Se activa en cada `pull_request` a `main` (opened, synchronize, reopened).

```
PR abierto / actualizado
        │
        ▼
   validate              Tests unitarios + build del código fuente
        │ needs: validate == success
        ▼
   docker-build          Build de imagen Docker SIN push
                         Valida el artefacto antes del merge
```

El merge a `main` está bloqueado hasta que ambos jobs estén en verde
(branch protection ruleset con required status checks).

### CD — Entrega Continua (`cd.yml`)

Se activa en cada `push` a `main` (tras el merge del PR).
Ignora cambios en `airport-k8s/values.yaml` para evitar bucles.

```
Merge a main
        │
        ▼
   docker                Genera IMAGE_TAG (SHA del merge commit)
                         Build + push a Docker Hub
                         Tags: :{SHA} y :latest
        │ needs: docker == success
        │ IMAGE_TAG compartido via job outputs
        ▼
   gitops                Actualiza airport-k8s/values.yaml
                         con el mismo IMAGE_TAG
                         Commit + push a main [skip ci]
        │
        ▼
   Argo CD               Detecta cambio en values.yaml
                         Sincroniza clúster AKS
                         Rolling update sin downtime
```

> **Por qué el IMAGE_TAG se genera en CD y no en CI:**
> CI corre en el commit del PR y CD corre en el merge commit.
> Son SHA distintos. Si el tag se generara en CI, Docker Hub tendría
> la imagen con un SHA y `values.yaml` apuntaría a otro, rompiendo
> el despliegue en Argo CD. Al generarlo una sola vez en CD y
> compartirlo via `job outputs`, ambos jobs usan siempre el mismo tag.

## Estructura del repositorio

```
microservice-kubernets-cicd/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Pipeline CI (PR): validate + docker-build
│       └── cd.yml              # Pipeline CD (merge): docker push + gitops
├── airport-k8s/                # Helm Chart para Kubernetes
│   ├── charts/
│   ├── templates/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── Chart.yaml
│   └── values.yaml             # Actualizado automáticamente por cd.yml
├── microservices/              # Código fuente del microservicio
│   ├── src/
│   ├── coverage/
│   ├── Dockerfile
│   ├── jest.config.ts
│   ├── nodemon.json
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── Jenkinsfile                 # Definición formal equivalente del pipeline
├── .gitignore
└── README.md
```

## Secretos requeridos (GitHub Secrets)

| Secret            | Descripción |
|-------------------|-------------|
| `DOCKER_USERNAME` | Usuario de Docker Hub |
| `DOCKER_PASSWORD` | Token de acceso de Docker Hub (no la contraseña) |
| `PAT_GITHUB`      | Personal Access Token con permisos `repo` — usado por el job gitops para hacer push a `main` con bypass del ruleset |

## Branch Protection

El repositorio tiene configurado un ruleset sobre `main` con:

- **Require a pull request before merging** — bloquea push directo a `main`
- **Required status checks** — el merge está bloqueado hasta que pasen:
  - `validate`
  - `docker-build`
- **Bypass list** — `Repository admin` para permitir el push del job gitops

## Jenkinsfile

El archivo `Jenkinsfile` en la raíz del repositorio es la representación
formal y equivalente del flujo CI/CD completo, documentando cada stage
con su correspondencia directa a los workflows de GitHub Actions.
No se ejecuta en producción pero sirve como documentación técnica
del pipeline y referencia para una eventual migración a Jenkins.