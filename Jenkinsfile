
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

                    echo "Preflight checks passed."
                '''
            }
        }

        stage('Validate Compose') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env.example config -q
                    echo "Compose configuration is valid."
                '''
            }
        }

        stage('Frontend Lint') {
            steps {
                // Keep lint findings visible without blocking tests.
                catchError(
                    buildResult: 'UNSTABLE',
                    stageResult: 'UNSTABLE',
                    message: 'Frontend lint reported errors; continuing to tests.'
                ) {
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
                          '
                    '''
                }
            }
        }

        stage('Frontend Tests') {
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
                        npm test
                      '
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env.example build backend frontend
                '''
            }
        }
    }

    post {
        success {
            echo 'CI passed: tests and Docker image builds completed successfully.'
        }

        unstable {
            echo 'CI completed with warnings. Review lint findings and resolve them.'
        }

        failure {
            echo 'CI failed. Review Console Output for the failing stage.'
        }

        always {
            echo 'CI pipeline finished. No deployment was performed.'
        }
    }
}
