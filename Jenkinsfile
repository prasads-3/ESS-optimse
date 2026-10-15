// Posts an Adaptive Card to a Teams channel via incoming webhook (Workflows).
// Webhook URL lives in Jenkins "Secret text" credential ${TEAMS_CRED} — never in the repo.
// Never fails the build: notification errors are logged and swallowed.
def notifyTeams(String status, String color) {
  withCredentials([string(credentialsId: env.TEAMS_CRED, variable: 'TEAMS_URL')]) {
    sh """
      cat > teams-payload.json <<EOF
{
  "type": "message",
  "attachments": [{
    "contentType": "application/vnd.microsoft.card.adaptive",
    "content": {
      "\\\$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "type": "AdaptiveCard",
      "version": "1.4",
      "body": [
        { "type": "TextBlock", "size": "Large", "weight": "Bolder", "color": "${color}",
          "text": "ess deploy ${status}" },
        { "type": "FactSet", "facts": [
          { "title": "Build",  "value": "#${env.BUILD_NUMBER}" },
          { "title": "Branch", "value": "${env.GIT_BRANCH ?: 'n/a'}" },
          { "title": "Commit", "value": "${(env.GIT_COMMIT ?: 'n/a').take(8)}" }
        ]},
        { "type": "ActionSet", "actions": [
          { "type": "Action.OpenUrl", "title": "Open build log", "url": "${env.BUILD_URL}console" }
        ]}
      ]
    }
  }]
}
EOF
      curl -fsS -m 15 -H 'Content-Type: application/json' -d @teams-payload.json "\$TEAMS_URL" \
        || echo 'WARN: Teams notification failed (build status unaffected)'
      rm -f teams-payload.json
    """
  }
}

pipeline {
  agent any

  environment {
    BACKEND_IMAGE      = 'ess-backend'
    FRONTEND_IMAGE     = 'ess-frontend'
    BACKEND_CONTAINER  = 'ess-backend'
    FRONTEND_CONTAINER = 'ess-frontend'
    APP_NET            = 'ess-net'                       // frontend nginx resolves "ess-backend" here
    DB_NET             = 'production_database_default'   // postgres container lives here
    FRONTEND_PORT      = '8090'                          // host nginx proxies to 127.0.0.1:8090
    UPLOADS_VOLUME     = 'ess-uploads'                   // named volume — persists across redeploys
    MINIO_IMAGE        = 'ess-minio'                     // built from deploy/minio/Dockerfile (creds + port baked in)
    MINIO_CONTAINER    = 'minio'                         // must match S3_ENDPOINT host (http://minio:9010)
    MINIO_VOLUME       = 'ess-minio-data'                // named volume — objects persist across redeploys
    ENV_CRED           = 'ess-env'                       // Jenkins "Secret file" credential = .env.production
    TEAMS_CRED         = 'teams-webhook'                 // Jenkins "Secret text" credential = Teams incoming webhook URL
  }

  options {
    timeout(time: 25, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  triggers { githubPush() }          // or pollSCM('H/5 * * * *')

  stages {
    stage('Checkout') {
      steps {
        // CleanBeforeCheckout: wipe workspace leftovers (e.g. half-merged files
        // with conflict markers) so every build starts from a pristine tree
        checkout([
          $class: 'GitSCM',
          branches: scm.branches,
          userRemoteConfigs: scm.userRemoteConfigs,
          extensions: [[$class: 'CleanBeforeCheckout']]
        ])
      }
    }

    // Fail fast with a clear message if conflict markers ever reach the build
    stage('Sanity') {
      steps {
        sh '''
          if grep -rEl '^(<<<<<<<|=======|>>>>>>>)' frontend/package.json backend/package.json 2>/dev/null; then
            echo "FATAL: conflict markers in package.json"; exit 1
          fi
        '''
      }
    }

    stage('Build images') {
      steps {
        sh 'docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} -t ${BACKEND_IMAGE}:latest backend'
        sh 'docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} -t ${FRONTEND_IMAGE}:latest frontend'
        sh 'docker build -t ${MINIO_IMAGE}:latest deploy/minio'
      }
    }

    // Applies only NEW, unapplied migrations — additive, never resets data.
    // Backend image keeps the prisma CLI (single-stage build) exactly for this.
    stage('Migrate DB') {
      steps {
        withCredentials([file(credentialsId: env.ENV_CRED, variable: 'ENVFILE')]) {
          sh '''
            docker run --rm \
              --network ${DB_NET} \
              --env-file "$ENVFILE" \
              ${BACKEND_IMAGE}:${BUILD_NUMBER} \
              npx prisma migrate deploy
          '''
        }
      }
    }

    stage('Deploy') {
      steps {
        withCredentials([file(credentialsId: env.ENV_CRED, variable: 'ENVFILE')]) {
          sh '''
            # app network: frontend nginx upstream "ess-backend:3001" resolves on it
            docker network create ${APP_NET} 2>/dev/null || true

            # stop restart policy so the daemon can't resurrect them, then force-remove.
            # tolerate "no such container" on first deploy.
            for c in ${FRONTEND_CONTAINER} ${BACKEND_CONTAINER}; do
              docker update --restart=no  $c 2>/dev/null || true
              docker stop -t 10           $c 2>/dev/null || true
              docker rm -f                $c 2>/dev/null || true
              if docker ps -aq -f name="^$c$" | grep -q .; then
                echo "FATAL: container $c still present after rm"; exit 1
              fi
            done

            # minio: object storage for images. Started once, then left running —
            # NOT recreated on redeploy so files stay served during deploys.
            # Objects live in the ${MINIO_VOLUME} named volume either way.
            # Must be up BEFORE frontend: nginx resolves the "minio" upstream at startup.
            docker ps -q -f name="^${MINIO_CONTAINER}$" | grep -q . || {
              docker rm -f ${MINIO_CONTAINER} 2>/dev/null || true
              docker run -d \
                --name ${MINIO_CONTAINER} \
                --network ${APP_NET} \
                --restart unless-stopped \
                -v ${MINIO_VOLUME}:/data \
                ${MINIO_IMAGE}:latest
            }

            # backend: no published port — only frontend reaches it via ${APP_NET}
            # deploy the freshly built BUILD_NUMBER tag, NOT :latest —
            # :stable stays untouched until health checks pass
            # MinIO env passed explicitly (after --env-file so these win):
            # maps S3_ENDPOINT=http://minio:9010 / AWS_* creds onto the MINIO_* vars the app reads
            docker run -d \
              --name ${BACKEND_CONTAINER} \
              --network ${APP_NET} \
              --restart unless-stopped \
              --env-file "$ENVFILE" \
              -e MINIO_ENDPOINT=minio \
              -e MINIO_PORT=9010 \
              -e MINIO_USE_SSL=false \
              -e MINIO_ACCESS_KEY=minio-ess \
              -e MINIO_SECRET_KEY=minio123-ess \
              -e MINIO_BUCKET=ess \
              -e MINIO_PUBLIC_URL=https://ess.miraki.in \
              -v ${UPLOADS_VOLUME}:/app/public/uploads \
              ${BACKEND_IMAGE}:${BUILD_NUMBER}

            # attach postgres network so DATABASE_URL host resolves
            docker network connect ${DB_NET} ${BACKEND_CONTAINER}

            # frontend: serves SPA + proxies /api, /socket.io, /uploads to backend
            docker run -d \
              --name ${FRONTEND_CONTAINER} \
              --network ${APP_NET} \
              --restart unless-stopped \
              ${FRONTEND_IMAGE}:${BUILD_NUMBER}

            # attach edge net so containerized nginx resolves ${FRONTEND_CONTAINER} by name; reload to pick up new IP
            docker network connect edge ${FRONTEND_CONTAINER} || true
            docker exec edge-nginx nginx -s reload || true
          '''
        }
      }
    }

    stage('Health check') {
      steps {
        sh '''
          # 1) BACKEND + DB: /api/health returns {"db":"up"} only if process up AND SELECT 1 works
          for i in $(seq 1 15); do
            body=$(docker exec ${BACKEND_CONTAINER} wget -qO- http://127.0.0.1:3001/api/health 2>/dev/null || true)
            echo "$body" | grep -q '"db":"up"' && { echo "[OK] backend up + DB reachable: $body"; break; }
            [ $i -eq 15 ] && { echo "[FAIL] backend/DB unhealthy: $body"; docker logs --tail 50 ${BACKEND_CONTAINER}; exit 1; }
            sleep 2
          done

          # 2) MINIO: liveness probe from inside backend container — proves the
          #    backend->minio network path the uploads actually use
          for i in $(seq 1 10); do
            docker exec ${BACKEND_CONTAINER} wget -qO- http://minio:9010/minio/health/live >/dev/null 2>&1 \
              && { echo "[OK] minio reachable from backend"; break; }
            [ $i -eq 10 ] && { echo "[FAIL] minio unreachable from backend"; docker logs --tail 50 ${MINIO_CONTAINER}; exit 1; }
            sleep 2
          done

          # 3) FRONTEND: nginx serves the SPA
          docker exec ${FRONTEND_CONTAINER} wget -qO- http://127.0.0.1/ >/dev/null 2>&1 \
            && echo "[OK] frontend serving SPA" \
            || { echo "[FAIL] frontend not serving"; docker logs --tail 50 ${FRONTEND_CONTAINER}; exit 1; }

          # 4) PROXY PATH: frontend -> backend (the route real users hit)
          fbody=$(docker exec ${FRONTEND_CONTAINER} wget -qO- http://127.0.0.1/api/health 2>/dev/null || true)
          echo "$fbody" | grep -q '"db":"up"' \
            && echo "[OK] frontend->backend proxy works: $fbody" \
            || { echo "[FAIL] frontend cannot reach backend /api: $fbody"; docker logs --tail 50 ${FRONTEND_CONTAINER}; exit 1; }

          echo "ALL HEALTH CHECKS PASSED"
        '''
      }
    }

    // Only a build that passed ALL health checks becomes the fallback.
    // :stable always points at the last known-good image — rollback target.
    stage('Promote stable') {
      steps {
        sh '''
          docker tag ${BACKEND_IMAGE}:${BUILD_NUMBER}  ${BACKEND_IMAGE}:stable
          docker tag ${FRONTEND_IMAGE}:${BUILD_NUMBER} ${FRONTEND_IMAGE}:stable
          echo "Promoted build ${BUILD_NUMBER} to :stable"
        '''
      }
    }
  }

  post {
    success {
      echo "Deployed ess build ${BUILD_NUMBER} on 127.0.0.1:${FRONTEND_PORT}"
      script { notifyTeams('SUCCESS', 'good') }
    }
    failure {
      echo 'Deploy FAILED — check stage logs'
      // Auto-rollback: if the new containers are down/unhealthy and a known-good
      // :stable image exists, redeploy it. No-op when failure happened before
      // Deploy (old containers still running) or on the very first build.
      withCredentials([file(credentialsId: env.ENV_CRED, variable: 'ENVFILE')]) {
        sh '''
          docker image inspect ${BACKEND_IMAGE}:stable >/dev/null 2>&1 || { echo "no :stable image — skip rollback"; exit 0; }

          body=$(docker exec ${BACKEND_CONTAINER} wget -qO- http://127.0.0.1:3001/api/health 2>/dev/null || true)
          echo "$body" | grep -q '"db":"up"' && { echo "current containers healthy — skip rollback"; exit 0; }

          echo "ROLLING BACK to :stable"
          for c in ${FRONTEND_CONTAINER} ${BACKEND_CONTAINER}; do
            docker update --restart=no $c 2>/dev/null || true
            docker rm -f $c 2>/dev/null || true
          done

          # frontend nginx resolves the "minio" upstream at startup — ensure it's up
          docker ps -q -f name="^${MINIO_CONTAINER}$" | grep -q . || {
            docker rm -f ${MINIO_CONTAINER} 2>/dev/null || true
            docker run -d \
              --name ${MINIO_CONTAINER} \
              --network ${APP_NET} \
              --restart unless-stopped \
              -v ${MINIO_VOLUME}:/data \
              ${MINIO_IMAGE}:latest
          }

          docker run -d \
            --name ${BACKEND_CONTAINER} \
            --network ${APP_NET} \
            --restart unless-stopped \
            --env-file "$ENVFILE" \
            -e MINIO_ENDPOINT=minio \
            -e MINIO_PORT=9010 \
            -e MINIO_USE_SSL=false \
            -e MINIO_ACCESS_KEY=minio-ess \
            -e MINIO_SECRET_KEY=minio123-ess \
            -e MINIO_BUCKET=ess \
            -e MINIO_PUBLIC_URL=https://ess.miraki.in \
            -v ${UPLOADS_VOLUME}:/app/public/uploads \
            ${BACKEND_IMAGE}:stable
          docker network connect ${DB_NET} ${BACKEND_CONTAINER}

          docker run -d \
            --name ${FRONTEND_CONTAINER} \
            --network ${APP_NET} \
            --restart unless-stopped \
            ${FRONTEND_IMAGE}:stable

          docker network connect edge ${FRONTEND_CONTAINER} || true
          docker exec edge-nginx nginx -s reload || true

          echo "ROLLBACK COMPLETE — serving last known-good :stable"
        '''
      }
      script { notifyTeams('FAILED', 'attention') }
    }
    always  {
      // keep only the 2 newest numbered builds per image; drop older tags
      sh '''
        for img in ${BACKEND_IMAGE} ${FRONTEND_IMAGE}; do
          docker images $img --format '{{.Tag}}' | grep -E '^[0-9]+$' | sort -rn | tail -n +3 \
            | xargs -r -I{} docker rmi $img:{} || true
        done
        docker image prune -f || true
      '''
    }
  }
}
