pipeline {
    agent any

    options {
        timestamps()
        // Prevent concurrent builds from deploying to the same environment.
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
                            sh """
                                set -eu

                                normalized_config=\$(mktemp)
                                trap 'rm -f "\$normalized_config"' EXIT

                                # Normalize Windows line endings before loading config.
                                sed 's/\\r\$//' "\$SONAR_CONFIG_FILE" > "\$normalized_config"

                                . "\$normalized_config"

                                # Confirm required values exist without printing them.
                                test -n "\$SONAR_HOST_URL"
                                test -n "\$SONAR_PROJECT_KEY"
                                test -n "\$SONAR_SOURCES"
                                test -n "\$SONAR_AUTH_TOKEN"

                                # Use the token provided by Jenkins credentials.
                                export SONAR_TOKEN="\$SONAR_AUTH_TOKEN"

                                "${scannerHome}/bin/sonar-scanner" \
                                  -Dsonar.host.url="\$SONAR_HOST_URL" \
                                  -Dsonar.projectKey="\$SONAR_PROJECT_KEY" \
                                  -Dsonar.sources="\$SONAR_SOURCES"
                            """
                        }
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

                    echo "No conflicts found on the configured ESS staging ports."
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
                input(
                    message: 'Approve the ESS staging deployment and database migrations? Confirm that the target is the isolated staging database and the migration files have been reviewed.',
                    ok: 'Proceed with staging deployment'
                )
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
            echo 'Pipeline completed. Review deployment output and service status.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output before retrying.'
        }

        always {
            echo 'ESS pipeline finished.'
        }
    }
}