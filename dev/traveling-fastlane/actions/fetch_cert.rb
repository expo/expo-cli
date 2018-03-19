# So that we can require funcs.rb
$LOAD_PATH.unshift File.expand_path(__dir__, __FILE__)

require 'funcs'
require 'spaceship'
require 'json'
require 'base64'

$appleId, $password, $teamId, $isEnterprise = ARGV[0].gsub(/\s+/m, ' ').strip.split(" ")

ENV['FASTLANE_TEAM_ID'] = $teamId

json_reply = with_captured_stderr{
  begin
    Spaceship::Portal.login($appleId, $password)
    Spaceship::Portal.client.team_id = $teamId
    csr, pkey = Spaceship.certificate.create_certificate_signing_request()
    certs = [];

    if $isEnterprise == 'true'
      Spaceship::Portal.certificate.in_house.production.create!(csr: csr)
      certs = Spaceship::Portal.certificate.in_house.production.all()
    else
      Spaceship::Portal.certificate.production.create!(csr: csr)
      certs = Spaceship::Portal.certificate.production.all()
    end

    cert_content = certs.last.download()
    p12password = SecureRandom.base64()
    p12 = OpenSSL::PKCS12.create(p12password, 'key', pkey, cert_content)
    $stderr.puts(JSON.generate({result:'success',
                                certPrivateSigningKey:pkey,
                                certP12:Base64.encode64(p12.to_der),
                                certPassword:p12password,
                                certId: certs.last.id}))
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
