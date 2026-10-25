pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withEnv(["SCANNER_HOME=${scannerHome}"]) {
                        withCredentials([
                            file(
                                credentialsId: 'ESS_SONAR_CONFIG',
                                variable: 'SONAR_CONFIG_FILE'
                            )
                        ]) {
                            withSonarQubeEnv(
                                installationName: 'SonarQube',
                                credentialsId: 'sonarqube-token',
                                envOnly: true
                            ) {
                                sh '''
                                    set -eu
                                    set +x

                                    config=$(mktemp)
                                    trap 'rm -f "$config"' EXIT

                                    sed 's/\\r$//' "$SONAR_CONFIG_FILE" > "$config"
                                    . "$config"

                                    : "${SONAR_HOST_URL:?SonarQube URL is missing}"
                                    : "${SONAR_PROJECT_KEY:?Project key is missing}"
                                    : "${SONAR_SOURCES:?Sources are missing}"
                                    : "${SONAR_AUTH_TOKEN:?SonarQube token is missing}"

                                    if [ "$SONAR_PROJECT_KEY" != "ess-optimse" ]; then
                                        echo "ERROR: Unexpected SonarQube project key."
                                        exit 1
                                    fi

                                    export SONAR_TOKEN="$SONAR_AUTH_TOKEN"

                                    rm -f .scannerwork/report-task.txt

                                    "$SCANNER_HOME/bin/sonar-scanner" \
                                      -Dsonar.host.url="$SONAR_HOST_URL" \
                                      -Dsonar.projectKey="$SONAR_PROJECT_KEY" \
                                      -Dsonar.sources="$SONAR_SOURCES"

                                    test -s .scannerwork/report-task.txt

                                    echo "SonarQube analysis submitted successfully."
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('SonarQube Issue Report') {
            steps {
                catchError(
                    buildResult: 'UNSTABLE',
                    stageResult: 'UNSTABLE'
                ) {
                    withCredentials([
                        file(
                            credentialsId: 'ESS_SONAR_CONFIG',
                            variable: 'SONAR_CONFIG_FILE'
                        )
                    ]) {
                        sh '''
                            set -eu
                            set +x

                            test -f sonarqube_report.py
                            command -v python3 >/dev/null

                            config=$(mktemp)
                            trap 'rm -f "$config"' EXIT

                            sed 's/\\r$//' "$SONAR_CONFIG_FILE" > "$config"
                            . "$config"

                            : "${SONAR_HOST_URL:?SonarQube URL is missing}"
                            : "${SONAR_PROJECT_KEY:?Project key is missing}"
                            : "${SONAR_AUTH_TOKEN:?SonarQube token is missing}"

                            if [ "$SONAR_PROJECT_KEY" != "ess-optimse" ]; then
                                echo "ERROR: Report project key mismatch."
                                exit 1
                            fi

                            export SONAR_HOST_URL
                            export SONAR_PROJECT_KEY
                            export SONAR_AUTH_TOKEN

                            python3 sonarqube_report.py

                            test -s sonarqube-issues-report.html

                            echo "SonarQube HTML report generated."
                        '''

                        emailext(
                            to: 'prasad@mirakilabs.com',
                            from: 'no-reply@support.miraki.in',
                            replyTo: 'no-reply@support.miraki.in',
                            subject: "[SonarQube Report] ESS Optimse - Build #${env.BUILD_NUMBER}",
                            mimeType: 'text/html',
                            body: readFile('sonarqube-issues-report.html')
                        )

                        echo 'SonarQube report email sent to the configured recipient.'
                    }
                }
            }
        }

        stage('Preflight') {
            steps {
                sh '''
                    set -eu

                    docker --version
                    docker compose version
                    docker info >/dev/null

                    test -f compose.yaml
                    test -f backend/Dockerfile
                    test -f frontend/Dockerfile

                    echo "Preflight checks passed."
                '''
            }
        }

        stage('Validate Compose') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'ESS_DEPLOY_ENV',
                        variable: 'DEPLOY_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu

                        docker compose \
                          --project-name ess-optimse-jenkins \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          config -q

                        echo "Compose configuration is valid."
                    '''
                }
            }
        }

        stage('Check Deployment Ports') {
            steps {
                sh '''
                    set -eu
                    PROJECT="ess-optimse-jenkins"

                    for port in 18082 13001 15433 19000 19001; do
                        conflicts="$(
                            docker ps --format '{{.Names}} {{.Ports}}' \
                              | grep -E "(:${port}(-[0-9]+)?->)" \
                              | grep -v "^${PROJECT}-" \
                              || true
                        )"

                        if [ -n "$conflicts" ]; then
                            echo "ERROR: Port $port is already published:"
                            printf '%s\\n' "$conflicts"
                            echo "Stopping to avoid a port conflict."
                            exit 1
                        fi
                    done

                    echo "No conflicts found on the configured staging ports."
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'ESS_DEPLOY_ENV',
                        variable: 'DEPLOY_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu

                        docker compose \
                          --project-name ess-optimse-jenkins \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          build backend frontend

                        echo "Docker image build completed."
                    '''
                }
            }
        }

        stage('Approve Staging Deployment') {
            steps {
                timeout(time: 15, unit: 'MINUTES') {
                    input(
                        message: 'Approve only after confirming ESS_DEPLOY_ENV targets the isolated staging database and migrations have been reviewed.',
                        ok: 'Approve staging deployment'
                    )
                }
            }
        }

        stage('Apply Database Migrations') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'ESS_DEPLOY_ENV',
                        variable: 'DEPLOY_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu

                        docker compose \
                          --project-name ess-optimse-jenkins \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          run --rm backend \
                          npx prisma migrate deploy \
                          --schema=/app/prisma/schema.prisma

                        echo "Database migration command completed."
                    '''
                }
            }
        }

        stage('Deploy ESS') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'ESS_DEPLOY_ENV',
                        variable: 'DEPLOY_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu
                        PROJECT="ess-optimse-jenkins"

                        docker compose \
                          --project-name "$PROJECT" \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          up -d --no-build

                        docker compose \
                          --project-name "$PROJECT" \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          ps
                    '''
                }
            }
        }

        stage('Seed Staging Database') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'ESS_DEPLOY_ENV',
                        variable: 'DEPLOY_ENV_FILE'
                    )
                ]) {
                    sh '''
                        set -eu

                        docker compose \
                          --project-name ess-optimse-jenkins \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          run --rm backend \
                          node prisma/seed.js

                        echo "Staging database seeding completed."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'ESS pipeline completed successfully.'
        }

        unstable {
            echo 'Pipeline is UNSTABLE. Check SonarQube report stage and logs.'
        }

        failure {
            echo 'Pipeline failed. Review Console Output before retrying.'
        }

        always {
            echo 'ESS Optimse pipeline finished.'
        }
    }
}
