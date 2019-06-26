require 'spaceship'
require 'json'
require 'base64'
require_relative 'funcs'

$action, $appleId, $password, $teamId, $isEnterprise, $extraArgs = ARGV
ENV['FASTLANE_TEAM_ID'] = $teamId

def list()
  certs = nil
  if $isEnterprise == 'true'
    certs = Spaceship::Portal.certificate.in_house.all
  else
    certs = Spaceship::Portal.certificate.production.all
  end

  certs.map{ |cert|
    {
      id: cert.id,
      name: cert.name,
      status: cert.status,
      created: cert.created.to_time.to_i,
      expires: cert.expires.to_time.to_i,
      ownerType: cert.owner_type,
      ownerName: cert.owner_name,
      ownerId: cert.owner_id,
      serialNumber: cert.raw_data['serialNum'],
    }
  }
end

def create()
  csr, pkey = Spaceship.certificate.create_certificate_signing_request()
  cert = nil
  if $isEnterprise == 'true'
    cert = Spaceship::Portal.certificate.in_house.create!(csr: csr)
  else
    cert = Spaceship::Portal.certificate.production.create!(csr: csr)
  end
  cert_content = cert.download()
  certPassword = SecureRandom.base64()
  p12 = OpenSSL::PKCS12.create(certPassword, 'key', pkey, cert_content)
  return {
    certId: cert.id,
    certP12: Base64.encode64(p12.to_der),
    certPassword: certPassword,
    certPrivateSigningKey: pkey,
  }
end

def revoke(ids)
  certs = Spaceship.certificate.all.find_all { |cert| ids.include?(cert.id) }
  for cert in certs do
    cert.revoke!
  end
end

$result = nil

with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId

    if $action == 'list'
      $result = {
        result: 'success',
        certs: list(),
      }
    elsif $action == 'create'
      cert = create()
      $result = { result: 'success', **cert }
    elsif $action == 'revoke'
      ids = $extraArgs.split(',')
      revoke(ids)
      $result = { result: 'success' }
    else
      $result = {
        result: 'failure',
        reason: "Unknown action requested: #{$action}"
      }
    end
  rescue Spaceship::Client::UnexpectedResponse => e
    $result = {
      result: 'failure',
      reason: 'Unexpected response',
      rawDump: e.error_info || dump_error(e)
    }
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $result = {
      result: 'failure',
      reason: 'Invalid credentials',
      rawDump: invalid_cred.preferred_error_info
    }
  rescue Exception => e
    $result = {
      result: 'failure',
      reason: 'Unknown reason',
      rawDump: dump_error(e)
    }
  end
}

$stderr.puts JSON.generate($result)
