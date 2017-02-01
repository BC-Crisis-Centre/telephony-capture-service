#!groovy

node { // <1>
    checkout scm
    stage('Build') {
        input message: 'You REALLY want to build?', ok: 'Yes'
        withEnv(["STORES_COMPOSE_ARGS= -f docker-compose.yml -f env_STORES/docker-compose.yml -p stores "]) {
            sh './scripts/project; ./scripts/build-images;'
        }
    }
    stage('Test') {
        sh './scripts/jenkins qa'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}