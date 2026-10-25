
pipeline {
    agent any

    parameters {
        booleanParam(
            name: 'EMAIL_TEST_ONLY',
            defaultValue: false,
            description: 'Checked = test email only. Unchecked = full ESS staging pipeline.'
        )
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    stages {
        stage('Email Connectivity Test') {
            when {
                expression { params.EMAIL_TEST_ONLY == true }
            }
            steps {
                emailext(
                    to: 'prasad@mirakilabs.com',
                    from: 'no-reply@support.miraki.in',
                    replyTo: 'no-reply@support.miraki.in',
                    subject: "[Jenkins SMTP Test] ESS Optimse - Build #${env.BUILD_NUMBER}",
                    mimeType: 'text/plain',
                    body: """
Hello,

This is a Jenkins SMTP connectivity test.

Job: ${env.JOB_NAME}
Build: ${env.BUILD_NUMBER}

Test mode only. No deployment stages were executed.
"""
                )
            }
        }

        stage('Checkout') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
            }
            steps {
                checkout scm
            }
        }

        stage('SonarQube Analysis') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
            }
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

                                    test -n "$SONAR_HOST_URL"
                                    test -n "$SONAR_PROJECT_KEY"
                                    test -n "$SONAR_SOURCES"
                                    test -n "$SONAR_AUTH_TOKEN"

                                    if [ "$SONAR_PROJECT_KEY" != "ess-optimse" ]; then
                                        echo "ERROR: Unexpected SonarQube project key."
                                        exit 1
                                    fi

                                    export SONAR_TOKEN="$SONAR_AUTH_TOKEN"

                                    # Prevent accidentally using an old scan task.
                                    rm -f .scannerwork/report-task.txt

                                    "$SCANNER_HOME/bin/sonar-scanner" \
                                      -Dsonar.host.url="$SONAR_HOST_URL" \
                                      -Dsonar.projectKey="$SONAR_PROJECT_KEY" \
                                      -Dsonar.sources="$SONAR_SOURCES"

                                    test -s .scannerwork/report-task.txt

                                    echo "SonarQube scanner upload completed."
                                '''
                            }
                        }
                    }
                }
            }
        }

        stage('SonarQube Issue Report') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
            }
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

                            if [ "$SONAR_PROJECT_KEY" != "ess-optimse" ]; then
                                echo "ERROR: Report project key mismatch."
                                exit 1
                            fi

                            export SONAR_HOST_URL
                            export SONAR_PROJECT_KEY
                            export SONAR_AUTH_TOKEN

                            python3 sonarqube_report.py
                            test -s sonarqube-issues-report.html
                        '''

                        emailext(
                            to: 'prasad@mirakilabs.com',
                            from: 'no-reply@support.miraki.in',
                            replyTo: 'no-reply@support.miraki.in',
                            subject: "[SonarQube Report] ESS Optimse - Build #${env.BUILD_NUMBER}",
                            mimeType: 'text/html',
                            body: readFile('sonarqube-issues-report.html')
                        )
                    }
                }
            }
        }

        stage('Preflight') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
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
                expression { params.EMAIL_TEST_ONLY == false }
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
                expression { params.EMAIL_TEST_ONLY == false }
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
                            exit 1
                        fi
                    done

                    echo "No conflicts found on configured staging ports."
                '''
            }
        }

        stage('Build Docker Images') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
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
                expression { params.EMAIL_TEST_ONLY == false }
            }
            steps {
                input(
                    message: 'Verify ESS_DEPLOY_ENV points to the isolated staging database and review migrations before proceeding.',
                    ok: 'Approve staging deployment'
                )
            }
        }

        stage('Apply Database Migrations') {
            when {
                expression { params.EMAIL_TEST_ONLY == false }
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
                expression { params.EMAIL_TEST_ONLY == false }
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
                expression { params.EMAIL_TEST_ONLY == false }
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
            echo 'Pipeline completed successfully.'
        }

        unstable {
            echo 'Pipeline is UNSTABLE. Check the SonarQube report stage and logs.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output before retrying.'
        }

        always {
            echo 'ESS Optimse pipeline finished.'
        }
    }
}
