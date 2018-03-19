def with_captured_stderr
  old_stderr = $stderr
  $stderr = StringIO.new
  yield
  $stderr.string
ensure
  $stderr = old_stderr
end

def dump_error(e)
  {type: e.class.to_s, message: e.message, backtrace: e.backtrace}
end

def dumpCert(distOrPush, isEnterprise)
  if distOrPush == 'dumpDistCert'
    if isEnterprise == 'true'
      certs = Spaceship::Portal.certificate.production.in_house.all.map{|cert| cert.to_s}
      JSON.generate({result:'success', certs:certs})
    else
      certs = Spaceship::Portal.certificate.production.all.map{|cert| cert.to_s}
      JSON.generate({result:'success', certs:certs})
    end
  elsif distOrPush == 'dumpPushCert'
    if isEnterprise == 'true'
      certs = Spaceship::Portal.certificate.production_push.in_house.all.map{|cert| cert.to_s}
      JSON.generate({result:'success', certs:certs})
    else
      certs = Spaceship::Portal.certificate.production_push.all.map{|cert| cert.to_s}
      JSON.generate({result:'success', certs:certs})
    end
  else
    JSON.generate({result:'failure', reason: "Unknown type of cert to dump: #{distOrPush}"})
  end
end
