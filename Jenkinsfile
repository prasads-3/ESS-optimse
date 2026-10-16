
pipeline {
    agent any

    options {
        timestamps()
        // Avoid two builds deploying to the same environment at once.
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                // Get the code from the repository and branch configured in Jenkins.
                checkout scm
            }
        }

        stage('Preflight') {
            steps {
                sh '''
                    set -eu

                    # Confirm that this Jenkins agent can access Docker.
                    docker --version
                    docker compose version
                    docker info >/dev/null

                    # Make sure the application files needed for the build exist.
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

                        # Validate the rendered configuration without starting services.
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

                    # These are the default host ports in compose.yaml.
                    # Keep this list in sync if the port configuration changes.
                    for port in 18082 13001 15433 19000 19001; do
                        conflicts="$(
                            docker ps --format '{{.Names}} {{.Ports}}' \
                              | grep -E "(:${port}(-[0-9]+)?->)" \
                              | grep -v "^${PROJECT}-" \
                              || true
                        )"

                        if [ -n "$conflicts" ]; then
                            echo "ERROR: Port $port is already published by another container:"
                            printf '%s\\n' "$conflicts"
                            echo "Deployment stopped to avoid a port conflict."
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

                        # Build the application images using the current source.
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
                // Require an explicit approval before creating or updating services.
                input(
                    message: 'Deploy ESS as a separate Compose project with new persistent volumes? Existing staging database and uploads will not be reused.',
                    ok: 'Proceed with deployment'
                )
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

                        # Start the services from the images built in this pipeline.
                        # The separate project name keeps its volumes separate too.
                        docker compose \
                          --project-name "$PROJECT" \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          up -d --no-build

                        # Show the resulting service status in the Jenkins log.
                        docker compose \
                          --project-name "$PROJECT" \
                          --file compose.yaml \
                          --env-file "$DEPLOY_ENV_FILE" \
                          ps
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed. Review the deployment output and service status.'
        }

        failure {
            echo 'Pipeline failed. Check Console Output before retrying.'
        }

        always {
            echo 'ESS pipeline finished.'
        }
    }
}
