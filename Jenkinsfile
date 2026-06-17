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
 *          Jobs    : validate     → tests + cobertura + build
 *                    lint         → Prettier + ESLint (paralelo)
 *                    sonar        → SonarCloud sobre el PR
 *                    snyk         → SCA + SAST (paralelo)
 *                    docker-build → build de imagen sin push
 *                                   needs: [validate, lint, sonar, snyk]
 *
 *    CD  → .github/workflows/cd.yml
 *          Trigger : push a main
 *                    (excluye cambios en airport-k8s/values.yaml)
 *          Jobs    : sonar-main   → SonarCloud en rama main
 *                    snyk-monitor → snapshot de dependencias en Snyk
 *                    docker       → build + push a Docker Hub
 *                                   needs: [sonar-main, snyk-monitor]
 *                    gitops       → actualiza airport-k8s/values.yaml
 *                                   con el SHA del merge commit
 *                                   needs: docker
 *
 *    CD  → Argo CD monitorea airport-k8s/values.yaml y sincroniza
 *          automáticamente el clúster AKS al detectar el nuevo tag
 *
 *  SEPARACIÓN CI/CD:
 *    - CI valida código, calidad, seguridad Y artefacto antes del merge
 *    - CD analiza seguridad en main, construye, publica y despliega
 *    - El IMAGE_TAG se genera una sola vez en el job docker del CD
 *      y se comparte con gitops via job outputs, garantizando que
 *      la imagen publicada y el tag en values.yaml son idénticos
 * ═══════════════════════════════════════════════════════════════
 */

pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        SONAR_TOKEN           = credentials('sonar-token')
        SNYK_TOKEN            = credentials('snyk-token')
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
        //  Propósito: verificar que el código es correcto,
        //  seguro y libre de vulnerabilidades ANTES de permitir
        //  el merge. El branch protection bloquea el merge hasta
        //  que los 5 jobs estén en verde.
        // ══════════════════════════════════════════════════════

        stage('Checkout') {
            /*
             * Equivalente al step: actions/checkout@v4 en cada job del CI.
             * Descarga el contenido completo del repositorio en el agente.
             * Garantiza que el pipeline trabaja siempre sobre el estado
             * más reciente de la rama del Pull Request.
             */
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
             * Equivalente al step: npm ci en los jobs validate, lint y snyk.
             * Instalación determinista usando package-lock.json.
             * A diferencia de npm install, npm ci garantiza reproducibilidad
             * exacta entre el entorno local y el runner de CI.
             */
            steps {
                dir('microservices') {
                    sh 'npm ci'
                }
            }
        }

        stage('Run Tests & Coverage') {
            /*
             * Equivalente al step: npm run test:coverage en el job validate.
             * Ejecuta la suite de tests unitarios con Jest y genera el
             * reporte de cobertura en formato LCOV (coverage/lcov.info).
             * Si falla, los stages siguientes no se ejecutan (Fail Fast).
             * En GitHub Actions el artifact lcov.info se sube para que
             * el job sonar pueda descargarlo y enviarlo a SonarCloud.
             */
            steps {
                dir('microservices') {
                    sh 'npm run test:coverage'
                }
            }
        }

        stage('Build Project') {
            /*
             * Equivalente al step: npm run build en el job validate.
             * Compila TypeScript a JavaScript validando que el código
             * fuente puede construirse sin errores de tipado ni sintaxis.
             * Actúa como segunda puerta de calidad tras los tests.
             */
            steps {
                dir('microservices') {
                    sh 'npm run build'
                }
            }
        }

        stage('Lint & Format Check') {
            /*
             * Equivalente al job: lint en ci.yml (corre en paralelo con validate).
             * Ejecuta dos validaciones sobre el código TypeScript:
             *
             *   1. Prettier (format:check): verifica que el formato del código
             *      cumple con las reglas definidas en .prettierrc. Detecta
             *      problemas de indentación, comillas, trailing commas, etc.
             *
             *   2. ESLint (lint): análisis estático con reglas tipadas mediante
             *      typescript-eslint. Configurado con --max-warnings=12 como
             *      techo progresivo mientras se limpia la base de código.
             *
             * Si cualquiera de los dos falla, el merge queda bloqueado.
             */
            steps {
                dir('microservices') {
                    sh 'npm run format:check'
                    sh 'npm run lint'
                }
            }
        }

        stage('SonarCloud Analysis') {
            /*
             * Equivalente al job: sonar en ci.yml (needs: validate).
             * Envía el código fuente y el reporte de cobertura LCOV a
             * SonarCloud para análisis estático de calidad y seguridad.
             *
             * En GitHub Actions el job sonar:
             *   - Descarga el artifact lcov.info generado por validate
             *   - Corrige las rutas con sed (backslash → slash) porque
             *     el lcov fue generado en Windows y el runner es Linux
             *   - Ejecuta el scanner de SonarCloud sobre src/
             *
             * SonarCloud reporta: Quality Gate, cobertura acumulada,
             * nuevos issues, code smells y security hotspots.
             * Los resultados aparecen como comentario directo en el PR.
             */
            steps {
                dir('microservices') {
                    sh """
                        sed -i 's|SF:src\\\\|SF:src/|g' coverage/lcov.info
                        sed -i 's|\\\\|/|g' coverage/lcov.info
                        sonar-scanner \
                          -Dsonar.projectBaseDir=. \
                          -Dsonar.login=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('Snyk Security Scan') {
            /*
             * Equivalente al job: snyk en ci.yml (corre en paralelo con lint).
             * Ejecuta dos tipos de análisis de seguridad:
             *
             *   1. snyk test (SCA — Software Composition Analysis):
             *      Escanea las dependencias del package.json contra la base
             *      de datos de vulnerabilidades de Snyk. Bloquea el pipeline
             *      si encuentra vulnerabilidades de severidad HIGH o CRITICAL.
             *      Flag: --severity-threshold=high --all-projects
             *
             *   2. snyk code test (SAST — Static Application Security Testing):
             *      Analiza el código fuente TypeScript para detectar patrones
             *      inseguros como injection, path traversal o hardcoded secrets.
             *      Flag: --severity-threshold=high
             *
             * Si alguno detecta vulnerabilidades sobre el threshold, el merge
             * queda bloqueado hasta que se corrijan o se acepten como riesgo.
             */
            steps {
                dir('microservices') {
                    sh """
                        snyk test --severity-threshold=high --all-projects
                        snyk code test --severity-threshold=high
                    """
                }
            }
        }

        stage('Docker Build — Validation') {
            /*
             * Equivalente al job: docker-build en ci.yml
             *   needs: [validate, lint, sonar, snyk]
             *
             * Construye la imagen Docker SIN hacer push al registro.
             * Solo se ejecuta cuando los 4 jobs anteriores pasan en verde.
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
        //  Propósito: analizar seguridad en main, producir y
        //  entregar el artefacto desplegable.
        //  El IMAGE_TAG se genera una sola vez en el job docker
        //  y se reutiliza en gitops via outputs, garantizando
        //  consistencia entre Docker Hub y values.yaml.
        // ══════════════════════════════════════════════════════

        stage('SonarCloud — Main Branch') {
            /*
             * Equivalente al job: sonar-main en cd.yml
             *   Corre en paralelo con snyk-monitor.
             *
             * A diferencia del job sonar del CI (que analiza el PR),
             * este job analiza la rama main tras el merge y actualiza
             * el dashboard global del proyecto en SonarCloud.
             *
             * Esto es necesario porque en el plan gratuito de SonarCloud
             * el overall del proyecto solo se actualiza con análisis
             * directos sobre la rama principal, no con análisis de PRs.
             *
             * Genera los tests y la cobertura frescos sobre el merge
             * commit para garantizar que el reporte refleja el estado
             * real del código en producción.
             */
            steps {
                dir('microservices') {
                    sh 'npm ci'
                    sh 'npm run test:coverage'
                    sh """
                        sed -i 's|SF:src\\\\|SF:src/|g' coverage/lcov.info
                        sed -i 's|\\\\|/|g' coverage/lcov.info
                        sonar-scanner \
                          -Dsonar.projectBaseDir=. \
                          -Dsonar.login=${SONAR_TOKEN}
                    """
                }
            }
        }

        stage('Snyk Monitor — Register Snapshot') {
            /*
             * Equivalente al job: snyk-monitor en cd.yml
             *   Corre en paralelo con sonar-main.
             *
             * A diferencia de snyk test (que bloquea el pipeline ante
             * vulnerabilidades), snyk monitor registra una snapshot del
             * estado actual de las dependencias en el dashboard de Snyk.
             *
             * Propósito: monitoreo continuo post-despliegue. Si en el
             * futuro aparece una nueva vulnerabilidad en una dependencia
             * que ya está en producción, Snyk envía una alerta automática
             * sin necesidad de que el código cambie.
             *
             * Flag: --all-projects para incluir todas las dependencias.
             */
            steps {
                dir('microservices') {
                    sh 'npm ci'
                    sh "snyk monitor --all-projects"
                }
            }
        }

        stage('Generate Image Tag') {
            /*
             * Equivalente al step: Generate Image Tag en el job docker del CD.
             * Genera el tag basado en el SHA corto del merge commit.
             *
             * CRÍTICO: este tag se genera UNA SOLA VEZ y se comparte con
             * el stage 'Update Helm Values — GitOps'. En GitHub Actions esto
             * se logra via job outputs (steps.tag.outputs.IMAGE_TAG →
             * needs.docker.outputs.image_tag). Esto resuelve el problema
             * de SHA inconsistente que ocurre cuando CI y CD corren en
             * commits distintos (PR commit vs merge commit).
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
             *   needs: [sonar-main, snyk-monitor]
             *
             * Construye la imagen con el tag del merge commit y publica
             * dos tags en Docker Hub:
             *   - nicolascifuentesb/airport-k8s:{SHA}  → versión específica
             *   - nicolascifuentesb/airport-k8s:latest → última versión
             *
             * La estrategia de doble tag permite:
             *   - Rollback a versiones anteriores referenciando el SHA exacto
             *   - Referencia simple con latest para entornos de desarrollo
             *
             * Las credenciales de Docker Hub se gestionan como Jenkins
             * credentials (equivalente a GitHub Secrets), nunca en texto plano.
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
             *   needs: docker
             *
             * Actualiza airport-k8s/values.yaml con el IMAGE_TAG generado
             * en el stage anterior (mismo SHA garantizado por la variable
             * de entorno compartida en Jenkins / job outputs en GitHub Actions).
             *
             * Flujo del step:
             *   1. sed reemplaza el campo tag: en values.yaml con el nuevo SHA
             *   2. git diff --cached verifica si hubo cambio real
             *   3. Si hubo cambio: commit con [skip ci] + push a main
             *   4. El [skip ci] y el paths-ignore en cd.yml evitan bucle infinito
             *
             * Una vez que el commit llega a main, Argo CD detecta la divergencia
             * entre el estado en Git (nuevo SHA) y el clúster AKS (SHA anterior)
             * y ejecuta automáticamente el rolling update sin downtime.
             *
             * En GitHub Actions el push usa PAT_GITHUB para bypass del ruleset
             * de branch protection (Repository admin en bypass list).
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
             * En implementación productiva este stage se integra con
             * Slack, Teams o un webhook para notificar al equipo.
             * Argo CD se encarga del monitoreo del despliegue una vez
             * que detecta el cambio en values.yaml y sincroniza AKS.
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