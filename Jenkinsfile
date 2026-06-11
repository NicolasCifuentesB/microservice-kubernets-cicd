/*
 * ═══════════════════════════════════════════════════════════════
 *  Jenkinsfile — CI/CD Pipeline (Definición formal de stages)
 *  Repositorio : NicolasCifuentesB/microservice-kubernets-cicd
 *  Aplicación  : airport-k8s — Microservicio Node.js + TypeScript
 *
 *  NOTA: Este pipeline es la representación formal y equivalente
 *  del flujo CI/CD implementado con GitHub Actions + Argo CD.
 *  La implementación productiva utiliza:
 *
 *    CI  → .github/workflows/ci.yml
 *          Trigger : pull_request a main
 *                    (opened, synchronize, reopened)
 *          Jobs    : validate  → tests + build del código fuente
 *                    docker-build → build de imagen sin push
 *                    (valida el artefacto antes del merge)
 *
 *    CD  → .github/workflows/cd.yml
 *          Trigger : push a main
 *                    (excluye cambios en airport-k8s/values.yaml)
 *          Jobs    : docker → build + push a Docker Hub
 *                    gitops → actualiza airport-k8s/values.yaml
 *                             con el SHA del merge commit
 *
 *    CD  → Argo CD monitorea airport-k8s/values.yaml y sincroniza
 *          automáticamente el clúster AKS al detectar el nuevo tag
 *
 *  SEPARACIÓN CI/CD:
 *    - CI valida el código Y el artefacto (imagen) antes del merge
 *    - CD construye, publica y despliega tras el merge a main
 *    - El IMAGE_TAG se genera una sola vez en CD y se comparte
 *      entre docker y gitops via job outputs, garantizando que
 *      la imagen publicada y el tag en values.yaml son idénticos
 * ═══════════════════════════════════════════════════════════════
 */

pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        IMAGE_NAME            = 'nicolascifuentesb/airport-k8s'
        NODE_VERSION          = '22'
        HELM_VALUES_PATH      = 'airport-k8s/values.yaml'
        REPO_URL              = 'https://github.com/NicolasCifuentesB/microservice-kubernets-cicd.git'
    }

    stages {

        // ══════════════════════════════════════════════════════
        //  PIPELINE CI
        //  Equivalente a : .github/workflows/ci.yml
        //  Trigger real  : pull_request a main
        //                  (opened, synchronize, reopened)
        //
        //  Propósito: verificar que el código es correcto
        //  e integrable ANTES de permitir el merge.
        //  El branch protection bloquea el merge hasta que
        //  los jobs 'validate' y 'docker-build' estén en verde.
        // ══════════════════════════════════════════════════════

        stage('Checkout') {
            steps {
                checkout scmGit(
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: "${REPO_URL}",
                        credentialsId: 'github-token'
                    ]]
                )
            }
        }

        stage('Install Dependencies') {
            /*
             * Equivalente al step: npm ci
             * Instalación determinista usando package-lock.json.
             * Garantiza reproducibilidad entre entornos.
             */
            steps {
                dir('microservices') {
                    sh "npm ci"
                }
            }
        }

        stage('Run Tests') {
            /*
             * Equivalente al step: npm run test:coverage
             * Ejecuta la suite de tests unitarios con Jest.
             * Genera reporte de cobertura de código.
             * Si falla, los stages siguientes no se ejecutan (Fail Fast).
             */
            steps {
                dir('microservices') {
                    sh 'npm run test:coverage'
                }
            }
        }

        stage('Build Project') {
            /*
             * Equivalente al step: npm run build
             * Compila TypeScript a JavaScript.
             * Valida que el código fuente puede construirse sin errores.
             */
            steps {
                dir('microservices') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker Build — Validation') {
            /*
             * Equivalente al job: docker-build en ci.yml
             * Construye la imagen Docker SIN hacer push al registro.
             *
             * Propósito: validar el artefacto real antes del merge.
             * Detecta errores del Dockerfile, dependencias de sistema
             * faltantes o problemas de configuración del contenedor
             * que los tests unitarios no pueden detectar.
             *
             * Al no hacer push, evita contaminar Docker Hub con
             * imágenes de PRs que no llegaron a main.
             */
            steps {
                dir('microservices') {
                    sh "docker build -t ${IMAGE_NAME}:pr-validation ."
                }
            }
        }

        // ══════════════════════════════════════════════════════
        //  PIPELINE CD
        //  Equivalente a : .github/workflows/cd.yml
        //  Trigger real  : push a main tras el merge del PR
        //                  (excluye airport-k8s/values.yaml
        //                   para evitar bucle infinito)
        //
        //  Propósito: producir y entregar el artefacto desplegable.
        //  El IMAGE_TAG se genera una sola vez en este pipeline
        //  y se reutiliza en todos los stages siguientes,
        //  garantizando consistencia entre la imagen publicada
        //  en Docker Hub y el tag registrado en values.yaml.
        // ══════════════════════════════════════════════════════

        stage('Generate Image Tag') {
            /*
             * Genera el tag basado en el SHA corto del merge commit.
             * Al correr después del merge, el SHA corresponde
             * exactamente al commit que llegó a main.
             *
             * Este mismo tag se usa en docker push y en gitops,
             * resolviendo el problema de SHA inconsistente entre
             * workflows que corren en commits distintos.
             */
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    echo "Image tag generado: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Docker Build & Push') {
            /*
             * Equivalente al job: docker en cd.yml
             * Construye la imagen con el tag del merge commit
             * y publica dos tags en Docker Hub:
             *   - nicolascifuentesb/airport-k8s:{SHA}   versión específica
             *   - nicolascifuentesb/airport-k8s:latest  última versión
             *
             * La estrategia de doble tag permite:
             *   - Rollback a versiones específicas usando el SHA
             *   - Referencia simple con latest en desarrollo
             */
            steps {
                dir('microservices') {
                    sh """
                        echo ${DOCKERHUB_CREDENTIALS_PSW} | \
                          docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin

                        docker build \
                          -t ${IMAGE_NAME}:${env.IMAGE_TAG} \
                          -t ${IMAGE_NAME}:latest .

                        docker push ${IMAGE_NAME}:${env.IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Update Helm Values — GitOps') {
            /*
             * Equivalente al job: gitops en cd.yml
             * Actualiza airport-k8s/values.yaml con el IMAGE_TAG
             * generado en el stage anterior (mismo SHA garantizado).
             *
             * El commit usa [skip ci] para evitar que el push
             * reactive el pipeline de CD recursivamente.
             * El paths-ignore en cd.yml actúa como segunda barrera.
             *
             * Una vez que el commit llega a main, Argo CD detecta
             * la divergencia entre el estado en Git y el clúster AKS
             * y ejecuta automáticamente el rolling update.
             */
            steps {
                withCredentials([string(
                    credentialsId: 'github-pat',
                    variable: 'GIT_PAT'
                )]) {
                    sh """
                        sed -i "s/tag:.*/tag: ${env.IMAGE_TAG}/" ${HELM_VALUES_PATH}

                        git config user.name  "jenkins[bot]"
                        git config user.email "jenkins[bot]@ci.local"

                        git add ${HELM_VALUES_PATH}

                        if git diff --cached --quiet; then
                          echo "No changes detected, skipping commit"
                          exit 0
                        fi

                        git commit -m "ci: update image tag to ${env.IMAGE_TAG} [skip ci]"
                        git push https://${GIT_PAT}@github.com/NicolasCifuentesB/microservice-kubernets-cicd.git HEAD:main
                    """
                }
            }
        }

        stage('Notify') {
            /*
             * Registro del resultado del pipeline.
             * En implementación productiva este stage puede
             * integrarse con Slack, Teams o un webhook.
             * Argo CD se encarga del monitoreo del despliegue
             * una vez que detecta el cambio en values.yaml.
             */
            steps {
                echo "Pipeline completado — imagen desplegada: ${IMAGE_NAME}:${env.IMAGE_TAG}"
                echo "Argo CD sincronizará el clúster AKS automáticamente."
            }
        }
    }

    post {
        success {
            echo """
                ✅ CI/CD exitoso.
                Imagen  : ${IMAGE_NAME}:${env.IMAGE_TAG}
                GitOps  : ${HELM_VALUES_PATH} actualizado.
                Próximo : Argo CD detecta el cambio y ejecuta
                          rolling update en AKS sin downtime.
            """
        }
        failure {
            echo """
                ❌ Pipeline fallido. Acciones recomendadas:
                1. Revisar logs del stage fallido.
                2. Corregir el error en la rama de feature.
                3. Abrir nuevo PR para reiniciar el flujo CI.
            """
        }
    }
}