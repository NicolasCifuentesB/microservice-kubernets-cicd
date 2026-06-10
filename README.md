# App — Microservicio Node.js con CI/CD Automatizado
 
Pipeline CI/CD completo: GitHub Actions (CI) + GitOps con Argo CD (CD)
Desplegado en Azure AKS mediante Helm.
 
## Stack
- Runtime: Node.js 20 LTS + Express
- Contenedor: Docker + Docker Hub
- CI/CD: GitHub Actions (3 jobs: verify, docker, gitops)
- Orquestación: Azure AKS + Helm
- CD / GitOps: Argo CD
 
## Ejecución local
  cd microservices  # Entrar al proyecto con los microservicios
  npm ci       	    # Instalar dependencias
  npm test     	    # Ejecutar tests unitarios
  npm run build 	# Build del proyecto
  npm start    	    # Iniciar servidor (puerto 3000)
 
## Flujo CI/CD
1. Push / PR a main → dispara GitHub Actions
2. Job verify: tests + build (Fail Fast)
3. Job docker: build imagen + push a Docker Hub
4. Job gitops: actualiza helm/values.yaml con nuevo tag
5. Argo CD detecta cambio y sincroniza con AKS
6. Rolling update en el cluster sin downtime
 
## Variables y Secretos requeridos (GitHub Secrets)
  DOCKERHUB_USERNAME   Usuario de Docker Hub

  DOCKERHUB_TOKEN  	Token de acceso (no password)
 
## Estructura del repositorio
  src/            	Código fuente

  test/           	Tests unitarios
  
  helm/           	Chart de Helm
  
  .github/workflows/  Pipeline GitHub Actions
  
  Jenkinsfile     	Definición de stages CD