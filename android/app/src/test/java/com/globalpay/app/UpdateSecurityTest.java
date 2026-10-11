package com.globalpay.app;
import org.junit.Test;
import static org.junit.Assert.*;

public class UpdateSecurityTest {
    @Test public void onlyNewerStableVersions() {
        assertTrue(UpdateSecurity.newer("v1.0.22", "1.0.21"));
        assertTrue(UpdateSecurity.newer("1.10.0", "1.9.9"));
        for (String value : new String[] { "1.0.21", "1.0.20", "1.0.22-beta", "../1.0.23", "1.0", "999999999999999999999999.0.0" }) assertFalse(UpdateSecurity.newer(value, "1.0.21"));
    }
    @Test public void requiresExactPublicRepositoryPathDigestAndSize() {
        String tag = "v1.0.22";
        String url = UpdateSecurity.PREFIX + tag + "/GlobalPay.apk";
        String digest = "sha256:" + new String(new char[64]).replace('\0', 'a');
        assertTrue(UpdateSecurity.trustedAsset(url, tag, digest, 100));
        assertFalse(UpdateSecurity.trustedAsset(url + "?url=evil", tag, digest, 100));
        assertFalse(UpdateSecurity.trustedAsset(url.replace("GlobalPay-Releases", "Other"), tag, digest, 100));
        assertFalse(UpdateSecurity.trustedAsset(url, tag, "", 100));
        assertFalse(UpdateSecurity.trustedAsset(url, tag, digest, UpdateSecurity.MAX_BYTES + 1));
        assertFalse(UpdateSecurity.trustedAsset(url, tag, digest, 0));
    }
    @Test public void redirectsCannotDowngradeOrLeaveGithubAssetHosts() {
        assertTrue(UpdateSecurity.trustedRedirect("https://release-assets.githubusercontent.com/file?token=example"));
        for (String url : new String[] { "http://github.com/file", "https://github.com.evil.test/file", "https://github.com@evil.test/file", "https://github.com:444/file", "file:///tmp/app.apk", "https://evil.test/file" }) assertFalse(UpdateSecurity.trustedRedirect(url));
    }
}
