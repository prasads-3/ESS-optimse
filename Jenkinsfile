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

                    withSonarQubeEnv(
                        installationName: 'SonarQube',
                        credentialsId: 'sonarqube-token',
                        envOnly: true
                    ) {
                        // Use the token injected by Jenkins as SONAR_TOKEN.
                        // Avoid injecting the legacy sonar.login property.
                        withEnv(["SONAR_TOKEN=${env.SONAR_AUTH_TOKEN}"]) {
                            sh """
                                set -eu
                                test -n "\$SONAR_TOKEN"
                                "${scannerHome}/bin/sonar-scanner"
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
