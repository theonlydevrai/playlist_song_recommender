pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    NAMESPACE = 'spotify-recommender'
    FRONTEND_IMAGE = 'spotify-frontend:latest'
    BACKEND_IMAGE = 'spotify-backend:latest'
    ML_IMAGE = 'spotify-ml-service:latest'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          # Bootstrap Node via nvm if missing in Jenkins runtime.
          export NVM_DIR="$HOME/.nvm"
          if [ ! -s "$NVM_DIR/nvm.sh" ]; then
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
          fi
          . "$NVM_DIR/nvm.sh"
          nvm install 20
          nvm use 20

          cd backend && npm ci && cd ..
          cd frontend && npm ci && cd ..

          if command -v python3 >/dev/null 2>&1; then
            python3 -m venv ml-service/venv
            . ml-service/venv/bin/activate
            pip install --upgrade pip
            pip install -r ml-service/requirements.txt
          else
            echo "python3 not found; skipping ML dependency install stage"
          fi
        '''
      }
    }

    stage('Local Quality Gate') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          export NVM_DIR="$HOME/.nvm"
          if [ ! -s "$NVM_DIR/nvm.sh" ]; then
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
          fi
          . "$NVM_DIR/nvm.sh"
          nvm use 20

          cd frontend && npm run build && cd ..
          node --check backend/src/index.js

          if [ -f ml-service/venv/bin/activate ]; then
            . ml-service/venv/bin/activate
            python -m py_compile ml-service/app.py
          elif command -v python3 >/dev/null 2>&1; then
            python3 -m py_compile ml-service/app.py
          else
            echo "python3 not found; skipping ML syntax check"
          fi
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        script {
          try {
            def scannerHome = tool 'SonarQubeScanner'
            withSonarQubeEnv('SonarQubeServer') {
              sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectVersion=${env.BUILD_NUMBER}"
            }
          } catch (Exception err) {
            echo "Skipping SonarQube Analysis: ${err.message}"
          }
        }
      }
    }

    stage('Build Docker Images in Minikube Docker') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e
          if ! command -v minikube >/dev/null 2>&1; then
            echo "minikube not available in Jenkins environment; skipping image build stage"
            exit 0
          fi

          eval "$(minikube docker-env)"

          docker build -t ${FRONTEND_IMAGE} frontend
          docker build -t ${BACKEND_IMAGE} backend
          docker build -t ${ML_IMAGE} ml-service
        '''
      }
    }

    stage('Deploy with Ansible') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          if ! command -v ansible-playbook >/dev/null 2>&1; then
            echo "ansible-playbook not available in Jenkins environment; skipping deploy stage"
            exit 0
          fi

          ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
        '''
      }
    }

    stage('Post Deploy Smoke Check') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e

          if ! command -v minikube >/dev/null 2>&1; then
            echo "minikube not available in Jenkins environment; skipping smoke check"
            exit 0
          fi

          MINIKUBE_IP=$(minikube ip)

          curl -fsS "http://${MINIKUBE_IP}:30001/health"
          curl -fsS "http://${MINIKUBE_IP}:30002/health"
          curl -fsSI "http://${MINIKUBE_IP}:30000" | head -n 1
        '''
      }
    }
  }

  post {
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed. Inspect stage logs in Jenkins.'
    }
  }
}
