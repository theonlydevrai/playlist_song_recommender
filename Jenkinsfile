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
          export NVM_DIR="$HOME/.nvm"
          . "$NVM_DIR/nvm.sh"

          cd backend && npm ci && cd ..
          cd frontend && npm ci && cd ..

          python3 -m venv ml-service/venv
          . ml-service/venv/bin/activate
          pip install -r ml-service/requirements.txt
        '''
      }
    }

    stage('Local Quality Gate') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e
          export NVM_DIR="$HOME/.nvm"
          . "$NVM_DIR/nvm.sh"

          cd frontend && npm run build && cd ..
          node --check backend/src/index.js
          . ml-service/venv/bin/activate
          python -m py_compile ml-service/app.py
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        script {
          def scannerHome = tool 'SonarQubeScanner'
          withSonarQubeEnv('SonarQubeServer') {
            sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectVersion=${env.BUILD_NUMBER}"
          }
        }
      }
    }

    stage('Build Docker Images in Minikube Docker') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e
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
          ansible-playbook -i ansible/inventory.ini ansible/deploy.yml
        '''
      }
    }

    stage('Post Deploy Smoke Check') {
      steps {
        sh '''#!/usr/bin/env bash
          set -e
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
