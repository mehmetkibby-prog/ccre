import {openSync, fstatSync, readFileSync, closeSync, constants} from 'node:fs';
import {createHash} from 'node:crypto';

// Read only at module initialization. This identifies the installer-verified
// manifest, not a fresh verification of every installed file or any benchmark.
export function readBuildIdentity477(url, role) {
  if (!['native', 'live', 'test'].includes(role)) throw Error('invalid_build_role');
  const absent = Object.freeze({schema:'col-build-identity-v1',role,available:false,manifestSha256:null});
  let fd;
  try {
    fd = openSync(url, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size < 2 || stat.size > 2 * 1024 * 1024) return absent;
    const bytes = readFileSync(fd);
    if (bytes.length !== stat.size) return absent;
    const manifest = JSON.parse(bytes);
    if (!Array.isArray(manifest.files) || manifest.files.length > 20000 ||
        (role === 'native' ? manifest.schemaVersion !== 1 || manifest.version !== '417' : manifest.role !== role)) return absent;
    return Object.freeze({schema:'col-build-identity-v1',role,available:true,manifestSha256:createHash('sha256').update(bytes).digest('hex')});
  } catch { return absent; }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function publicBuildIdentity477(value, role) {
  const ok = value?.schema === 'col-build-identity-v1' && value.role === role && value.available === true &&
    typeof value.manifestSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.manifestSha256);
  return {schema:'col-build-identity-v1',role,available:ok,manifestSha256:ok ? value.manifestSha256 : null};
}
