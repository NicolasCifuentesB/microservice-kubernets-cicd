/*
 * ═══════════════════════════════════════════════════════════════
 *  Jenkinsfile — CI/CD Pipeline (Definición formal de stages)
 *  Repositorio : NicolasCifuentesB/microservice-kubernets-cicd
 *  Aplicación  : airport-k8s — Microservicio Node.js + TypeScript
 *
 *  NOTA: Este pipeline es la representación formal y equivalente
 *  del flujo CI/CD implementado con GitHub Actions + Argo CD.
 *  La implementación productiva utiliza:
 *    CI  → .github/workflows/ci.yml  (trigger: pull_request a main)
 *    CD  → .github/workflows/cd.yml  (trigger: push a main)
 *    CD  → Argo CD sincroniza automáticamente el clúster AKS
 *          al detectar cambios en airport-k8s/values.yaml
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

        // ──────────────────────────────────────────────────────
        //  PIPELINE CI
        //  Equivalente a: .github/workflows/ci.yml
        //  Trigger real : pull_request a main
        //                 (opened, synchronize, reopened)
        // ──────────────────────────────────────────────────────

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
            steps {
                dir('microservices') {
                    sh 'npm ci'
                }
            }
        }

        stage('Run Tests') {
            /*
             * Equivalente al step: npm run test:coverage
             * Ejecuta la suite de tests unitarios con Jest.
             * Si falla, los stages siguientes no se ejecutan.
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
             * Valida que el artefacto final puede construirse sin errores.
             */
            steps {
                dir('microservices') {
                    sh 'npm run build'
                }
            }
        }

        stage('Generate Image Tag') {
            /*
             * Genera un tag único basado en el SHA corto del commit.
             * Mismo criterio que en ci.yml:
             *   git rev-parse --short HEAD
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

        stage('Build Docker Image') {
            /*
             * Construye la imagen desde microservices/Dockerfile.
             * Genera dos tags:
             *   - nicolascifuentesb/airport-k8s:{SHA}   (versión específica)
             *   - nicolascifuentesb/airport-k8s:latest  (última versión)
             */
            steps {
                dir('microservices') {
                    sh """
                        docker build \
                          -t ${IMAGE_NAME}:${env.IMAGE_TAG} \
                          -t ${IMAGE_NAME}:latest .
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            /*
             * Publica ambos tags en Docker Hub.
             * Credenciales gestionadas como Jenkins secret 'dockerhub-credentials'.
             * Equivalente a los steps de docker/login-action y docker push en ci.yml.
             */
            steps {
                sh """
                    echo ${DOCKERHUB_CREDENTIALS_PSW} | \
                      docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin
                    docker push ${IMAGE_NAME}:${env.IMAGE_TAG}
                    docker push ${IMAGE_NAME}:latest
                """
            }
        }

        // ──────────────────────────────────────────────────────
        //  PIPELINE CD — GitOps
        //  Equivalente a: .github/workflows/cd.yml
        //  Trigger real : push a main
        //                 (excluye cambios en airport-k8s/values.yaml
        //                  para evitar bucle infinito)
        // ──────────────────────────────────────────────────────

        stage('Update Helm Values') {
            /*
             * Actualiza el tag de imagen en airport-k8s/values.yaml.
             * Este archivo es la fuente de verdad del estado deseado
             * del clúster. Argo CD monitorea este archivo y sincroniza
             * automáticamente al detectar el cambio.
             *
             * El commit usa [skip ci] para evitar que el push
             * reactive el pipeline recursivamente.
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
                Imagen : ${IMAGE_NAME}:${env.IMAGE_TAG}
                GitOps : airport-k8s/values.yaml actualizado.
                Próximo: Argo CD detecta el cambio y ejecuta rolling update en AKS.
            """
        }
        failure {
            echo """
                ❌ Pipeline fallido. Acciones recomendadas:
                1. Revisar logs del stage fallido.
                2. Corregir el error en la rama de feature.
                3. Abrir nuevo PR para reiniciar el flujo.
            """
        }
    }
}