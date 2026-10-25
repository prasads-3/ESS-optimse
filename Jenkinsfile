pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    parameters {
        booleanParam(
            name: 'EMAIL_TEST_ONLY',
            defaultValue: true,
            description: 'TEMPORARY: Send test email only; skip ESS deployment'
        )
    }

    stages {
        // TEMPORARY TEST: this stage runs when EMAIL_TEST_ONLY is true.
        stage('Email Connectivity Test') {
            when {
                expression {
                    return params.EMAIL_TEST_ONLY != false
                }
            }
            steps {
                emailext(
                    to: 'prasad@mirakilabs.com',
                    from: 'no-reply@support.miraki.in',
                    replyTo: 'no-reply@support.miraki.in',
                    subject: "[Jenkins SMTP Test] ESS Optimse - Build #${env.BUILD_NUMBER}",
                    mimeType: 'text/plain',
                    body: """Hello,

This is a test email from the ESS Optimse Jenkins job.

Job: ${env.JOB_NAME}
Build: #${env.BUILD_NUMBER}
Build URL: ${env.BUILD_URL}

This message verifies email delivery only.
It does not contain a SonarQube issue report.

If you received this email, please confirm delivery.

Regards,
Jenkins
"""
                )
            }
        }

        // Existing ESS pipeline stages run only when test mode is disabled.
        stage('Checkout') {
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
                                set +x

                                normalized_config=\$(mktemp)
                                trap 'rm -f "\$normalized_config"' EXIT

                                sed 's/\\r\$//' "\$SONAR_CONFIG_FILE" > "\$normalized_config"
                                . "\$normalized_config"

                                test -n "\$SONAR_HOST_URL"
                                test -n "\$SONAR_PROJECT_KEY"
                                test -n "\$SONAR_SOURCES"
                                test -n "\$SONAR_AUTH_TOKEN"

                                export SONAR_TOKEN="\$SONAR_AUTH_TOKEN"

                                "${scannerHome}/bin/sonar-scanner" \\
                                  -Dsonar.host.url="\$SONAR_HOST_URL" \\
                                  -Dsonar.projectKey="\$SONAR_PROJECT_KEY" \\
                                  -Dsonar.sources="\$SONAR_SOURCES"
                            """
                        }
                    }
                }
            }
        }

        stage('Preflight') {
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
            steps {
                input(
                    message: 'Approve the ESS staging deployment and database migrations? Confirm that the target is the isolated staging database and the migration files have been reviewed.',
                    ok: 'Proceed with staging deployment'
                )
            }
        }

        stage('Apply Database Migrations') {
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            when {
                expression {
                    return params.EMAIL_TEST_ONLY == false
                }
            }
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
            script {
                if (params.EMAIL_TEST_ONLY != false) {
                    echo 'Email test step completed. Check the recipient Outlook inbox.'
                } else {
                    echo 'ESS pipeline completed. Review deployment output and service status.'
                }
            }
        }

        failure {
            script {
                if (params.EMAIL_TEST_ONLY != false) {
                    echo 'Email test failed. Check Console Output and Mailcow SMTP settings.'
                } else {
                    echo 'Pipeline failed. Check Console Output before retrying.'
                }
            }
        }

        always {
            echo 'ESS pipeline finished.'
        }
    }
}