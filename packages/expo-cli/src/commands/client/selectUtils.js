function choosePreferredCreds(context, credentials) {
  const { experienceName } = context;
  // prefer the one that matches our experienceName
  for (const credential of credentials) {
    if (credential.name.includes(experienceName)) {
      return credential;
    }
  }
  // else choose an arbitrary one
  return credentials[0];
}

export { choosePreferredCreds };
