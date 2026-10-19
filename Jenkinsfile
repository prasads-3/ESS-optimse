
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Auth Diagnostic') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'sonarqube-token',
                        variable: 'SQ_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu
                        umask 077

                        TMP_DIR="$(mktemp -d)"
                        trap 'rm -rf "$TMP_DIR"' EXIT

                        # Keep the token in a temporary, restricted file.
                        # Never print the token to the Jenkins console.
                        printf 'header = "Authorization: Bearer %s"\\n' \
                            "$SQ_TOKEN" > "$TMP_DIR/curl.conf"

                        echo "Checking SonarQube token..."

                        VALIDATE_STATUS="$(
                            curl --silent --show-error \
                                --config "$TMP_DIR/curl.conf" \
                                --output "$TMP_DIR/validate.json" \
                                --write-out '%{http_code}' \
                                'https://sonar.miraki.in/api/authentication/validate'
                        )"

                        echo "Token validation HTTP status: $VALIDATE_STATUS"
                        echo "Validation response:"
                        cat "$TMP_DIR/validate.json"
                        echo

                        echo "Checking authenticated server-version endpoint..."

                        VERSION_STATUS="$(
                            curl --silent --show-error \
                                --config "$TMP_DIR/curl.conf" \
                                --output "$TMP_DIR/version.txt" \
                                --write-out '%{http_code}' \
                                'https://sonar.miraki.in/api/server/version'
                        )"

                        echo "Authenticated server-version HTTP status: $VERSION_STATUS"

                        if [ "$VALIDATE_STATUS" != "200" ]; then
                            echo "RESULT: Token validation request failed."
                            exit 1
                        fi

                        if ! grep -Eq '"valid"[[:space:]]*:[[:space:]]*true' \
                            "$TMP_DIR/validate.json"; then
                            echo "RESULT: SonarQube did not confirm this token as valid."
                            exit 1
                        fi

                        if [ "$VERSION_STATUS" != "200" ]; then
                            echo "RESULT: Token is valid, but the version endpoint returned a non-200 status."
                            exit 1
                        fi

                        echo "RESULT: Token validated and authenticated version endpoint returned HTTP 200."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'SonarQube authentication diagnostic passed.'
        }

        failure {
            echo 'SonarQube authentication diagnostic failed. Review the HTTP statuses above.'
        }

        always {
            echo 'Diagnostic finished. No application deployment was performed.'
        }
    }
}
