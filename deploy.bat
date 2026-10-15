@echo off
setlocal
echo =======================================================
echo Starting Deployment for Employee Self-Service (monorepo)
echo =======================================================

echo 1. Cleaning old frontend build artifacts...
if exist "frontend\dist" rmdir /s /q "frontend\dist"

echo 2. Installing fresh frontend dependencies...
pushd frontend
call npm ci || (popd && echo "Frontend install failed!" && exit /b 1)

echo 3. Running automated tests...
call npm test || (popd && echo "Tests failed! Deployment aborted." && exit /b 1)
popd

echo 4. Building and deploying via Docker Compose...
docker compose -f deploy/docker-compose.yml -p ess up -d --build

echo 5. Performing local health check...
timeout /t 5
curl -s http://localhost:8090 > nul || (echo "Deployment health check failed! Please check logs." && exit /b 1)

echo 6. Image cleanup...
docker image prune -f

echo =======================================================
echo Deployment Sequence Completed Successfully!
echo =======================================================
endlocal
