#!groovy

node { // <1>
    checkout scm
    stage('Build') { // <2>
       sh './scripts/project; ./scripts/build-images;'
    }
    stage('Test') {
        println 'HHHHHHHHEEEEEEEEEEEEEEEEE'
        sh './scripts/jenkins qa'
    }
    stage('Deploy') {
        echo 'Deploy stage'
    }
}