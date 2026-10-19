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

        stage('SonarQube HTTP Diagnostic - No Deployment') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'sonarqube-token',
                        variable: 'SQ_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        umask 077

                        TMP_DIR="$(mktemp -d)"
                        trap 'rm -rf "$TMP_DIR"' EXIT

                        SERVER_URL="https://sonar.miraki.in"
                        VERSION_URL="$SERVER_URL/api/server/version"
                        VALIDATE_URL="$SERVER_URL/api/authentication/validate"

                        echo "======================================"
                        echo "TEST 1: Version endpoint WITHOUT token"
                        echo "======================================"

                        NOAUTH_STATUS="$(curl \
                            --silent --show-error \
                            --connect-timeout 10 \
                            --max-time 20 \
                            --output "$TMP_DIR/no-auth-body" \
                            --write-out '%{http_code}' \
                            "$VERSION_URL")"
                        NOAUTH_EXIT=$?

                        echo "HTTP status: $NOAUTH_STATUS"
                        echo "curl exit code: $NOAUTH_EXIT"
                        echo "Response (first 200 characters):"
                        head -c 200 "$TMP_DIR/no-auth-body" 2>/dev/null || true
                        echo
                        echo

                        echo "======================================"
                        echo "TEST 2: Token validation endpoint"
                        echo "======================================"

                        if [ -z "${SQ_TOKEN:-}" ]; then
                            echo "ERROR: Jenkins credential is empty."
                            exit 1
                        fi

                        printf 'header = "Authorization: Bearer %s"\\n' \
                            "$SQ_TOKEN" > "$TMP_DIR/curl.conf"

                        VALIDATE_STATUS="$(curl \
                            --silent --show-error \
                            --connect-timeout 10 \
                            --max-time 20 \
                            --config "$TMP_DIR/curl.conf" \
                            --output "$TMP_DIR/validate-body" \
                            --write-out '%{http_code}' \
                            "$VALIDATE_URL")"
                        VALIDATE_EXIT=$?

                        echo "HTTP status: $VALIDATE_STATUS"
                        echo "curl exit code: $VALIDATE_EXIT"
                        echo "Response (first 200 characters):"
                        head -c 200 "$TMP_DIR/validate-body" 2>/dev/null || true
                        echo
                        echo

                        echo "======================================"
                        echo "TEST 3: Version endpoint WITH token"
                        echo "======================================"

                        AUTH_STATUS="$(curl \
                            --silent --show-error \
                            --connect-timeout 10 \
                            --max-time 20 \
                            --config "$TMP_DIR/curl.conf" \
                            --output "$TMP_DIR/auth-body" \
                            --write-out '%{http_code}' \
                            "$VERSION_URL")"
                        AUTH_EXIT=$?

                        echo "HTTP status: $AUTH_STATUS"
                        echo "curl exit code: $AUTH_EXIT"
                        echo "Response (first 200 characters):"
                        head -c 200 "$TMP_DIR/auth-body" 2>/dev/null || true
                        echo
                        echo

                        echo "======================================"
                        echo "DIAGNOSTIC RESULTS"
                        echo "======================================"
                        echo "Version without token: $NOAUTH_STATUS"
                        echo "Token validation:      $VALIDATE_STATUS"
                        echo "Version with token:    $AUTH_STATUS"
                        echo
                        echo "Diagnostic run finished."
                        echo "No application deployment was performed."
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Diagnostic completed. Review the HTTP status codes in Console Output.'
        }

        failure {
            echo 'Diagnostic could not complete. Review Console Output.'
        }

        always {
            echo 'Diagnostic pipeline finished. No application deployment was performed.'
        }
    }
}
