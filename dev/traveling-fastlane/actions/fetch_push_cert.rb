# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
require 'base64'

$appleId, $password, $bundleId, $teamId, $isEnterprise = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")

ENV['FASTLANE_TEAM_ID'] = $teamId

json_reply = with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId
    csr, pkey = Spaceship.certificate.create_certificate_signing_request()
    cert = nil

    if $isEnterprise == 'true'
      cert = Spaceship::Portal.certificate.in_house.production_push.create!(csr: csr,
                                                                            bundle_id:$bundleId)
    else
      cert = Spaceship::Portal.certificate.production_push.create!(csr: csr,
                                                                   bundle_id:$bundleId)
    end

    x509_certificate = cert.download
    pushP12password = SecureRandom.base64()
    pushP12 = OpenSSL::PKCS12.create(pushP12password, 'production', pkey, x509_certificate)
    $stderr.puts(JSON.generate({result:'success',
                                pushPrivateSigningKey:pkey,
                                pushP12:Base64.encode64(pushP12.to_der),
                                pushPassword:pushP12password,
                                pushId: cert.id}))
  rescue Spaceship::Client::UnexpectedResponse => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unexpected response',
                                rawDump:e.error_info || dump_error(e)}))
  rescue Spaceship::Client::InvalidUserCredentialsError => invalid_cred
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Invalid credentials',
                                rawDump:invalid_cred.preferred_error_info}))
  rescue Exception => e
    $stderr.puts(JSON.generate({result:'failure',
                                reason:'Unknown reason',
                                rawDump:dump_error(e)}))
  end
}

$stderr.puts json_reply
