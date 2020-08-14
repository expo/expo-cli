export default `android {
  signingConfigs {
    release {
      // This is necessary to avoid needing the user to define a release signing config manually
      // If no release config is defined, and this is not present, build for assembleRelease will crash
    }
  }

  buildTypes {
    release {
      // This is necessary to avoid needing the user to define a release build type manually
    }
  }
}

project.afterEvaluate {
  android.signingConfigs.release { config ->
    def debug = gradle.startParameter.taskNames.any { it.toLowerCase().contains('debug') }

    if (debug) {
      return
    }

    def credentialsJson = rootProject.file("../credentials.json");

    if (credentialsJson.exists()) {
      if (config.storeFile) {
        println("Path to release keystore file is already set, ignoring 'credentials.json'")
      } else {
        try {
          def credentials = new groovy.json.JsonSlurper().parse(credentialsJson)

          storeFile rootProject.file("../" + credentials.android.keystore.keystorePath)
          storePassword credentials.android.keystore.keystorePassword
          keyAlias credentials.android.keystore.keyAlias
          keyPassword credentials.android.keystore.keyPassword
        } catch (Exception e) {
          println("An error occurred while parsing 'credentials.json': " + e.message)
        }
      }
    } else {
      if (config.storeFile == null) {
        println("Couldn't find a 'credentials.json' file, skipping release keystore configuration")
      }
    }
  }

  android.buildTypes.release { config ->
    config.signingConfig android.signingConfigs.release
  }
}
`;
