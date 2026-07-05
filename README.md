# Betcloud Training Hub

Training Hub is a demo-ready web application for managing training requests and mandatory training records for **Betcloud**. The project is prepared as a DevOps course assignment: Dockerized application, automated tests, container image build, and a deployment path for AWS.

## Architecture

Local and target deployment architecture:

```text
GitHub → GitHub Actions → Amazon ECR → Amazon ECS → Public URL
                          ↓
                      Amazon CloudWatch Logs
```

The application contains:

- React/Vite frontend,
- FastAPI backend,
- PostgreSQL database,
- Alembic database migrations,
- Dockerfile and Docker Compose configuration,
- demo seed data and demo account.

## Demo account

Use the following credentials after the container starts:

```text
login: demo
password: demo
```

The backend also creates the user as `demo@example.com`, so both `demo` and `demo@example.com` can be used on the login screen.

## Required endpoints

After startup, these endpoints are available:

```text
GET /health
GET /version
GET /api/health
GET /api/version
GET /training-process
GET /api/training-process
```

The `/training-process` endpoint is the public business endpoint required by the project. The full business workflow is available after login in the training request, proposal and mandatory training modules.

## Run locally with Docker

From the repository root:

```bash
docker compose up --build
```

Open the application:

```text
http://localhost:8000
```

The root URL opens the frontend login screen directly. You can still open the API metadata at `http://localhost:8000/api`.

Useful checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/version
curl http://localhost:8000/training-process
```

Stop the environment:

```bash
docker compose down
```

Stop and remove local database volumes:

```bash
docker compose down -v
```

## Run backend tests

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

## Local development mode

Start only PostgreSQL:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Backend:

```bash
cd backend
cp ../.env.example .env
alembic upgrade head
python seed.py
python seed_demo.py
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

## Version bump for CI/CD demo

For the recording, you can change the deployed version by editing the `VERSION` file:

```bash
printf "1.0.1\n" > VERSION
git add VERSION
git commit -m "Bump application version to 1.0.1"
git push origin main
```

After the pipeline deploys the new image, `GET /version` should return the new value.


## Environment variables and secrets

The repository should contain only example environment files, not real secrets.

Commit these files:

```text
.env.example
frontend/.env.example
```

Do not commit real local files such as:

```text
.env
backend/.env
frontend/.env
frontend/.env.local
```

Local Docker Compose uses demo-safe values so the project can be started quickly during review. For AWS deployment, provide real values through GitHub Actions secrets and ECS task environment variables or secrets.

Recommended GitHub Actions secrets for deployment:

```text
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
ECR_REPOSITORY
ECS_CLUSTER
ECS_SERVICE
JWT_SECRET
```

For a student project this is enough. In a production setup, prefer GitHub OIDC with an AWS IAM role instead of long-lived AWS access keys.

## Current CI workflow

The repository includes `.github/workflows/ci.yml`. It runs backend tests, builds the frontend and validates that the Docker image can be built. The AWS deployment workflow should be added after the ECR repository, ECS service and Terraform outputs are ready.

## Deployment notes

The Docker image is designed to run as a single ECS service container. On startup it can run Alembic migrations and seed the demo account. In AWS, use environment variables for database connection, JWT secret and application version. Application logs are written to stdout/stderr, which makes them available in CloudWatch Logs when the ECS task uses the `awslogs` log driver.

## Project metadata

Company: **Betcloud**  
Author: **Jarosław Bętkowski**
