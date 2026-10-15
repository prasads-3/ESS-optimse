pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
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
                    test -f .env.example
                    test -f backend/Dockerfile
                    test -f frontend/Dockerfile
                '''
            }
        }

        stage('Validate Compose') {
            steps {
                sh 'docker compose --env-file .env.example config -q'
            }
        }

        stage('Frontend Lint and Tests') {
            steps {
                sh '''
                    set -eu

                    docker run --rm \
                      --mount "type=bind,src=$WORKSPACE/frontend,dst=/source,readonly" \
                      node:22-alpine \
                      sh -ec '
                        mkdir -p /workspace
                        cp -R /source/. /workspace/
                        cd /workspace
                        npm ci
                        npm run lint
                        npm test
                      '
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker compose --env-file .env.example build backend frontend'
            }
        }
    }

    post {
        success {
            echo 'CI passed. Compose validated, frontend checks passed, and images built. No deployment performed.'
        }

        failure {
            echo 'CI failed. Review the failed stage logs. No deployment performed.'
        }
    }
}