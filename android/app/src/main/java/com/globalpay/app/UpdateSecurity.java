package com.globalpay.app;

import java.net.URI;

/** Kept independent of Android so release trust rules can be unit tested. */
final class UpdateSecurity {
    static final String API = "https://api.github.com/repos/naylinhtunit/GlobalPay-Releases/releases/latest";
    static final String PREFIX = "https://github.com/naylinhtunit/GlobalPay-Releases/releases/download/";
    static final long MAX_BYTES = 500_000_000L;

    static boolean newer(String next, String current) {
        if (!next.matches("v?\\d+\\.\\d+\\.\\d+") || !current.matches("v?\\d+\\.\\d+\\.\\d+")) return false;
        String[] a = next.replaceFirst("^v", "").split("\\.");
        String[] b = current.replaceFirst("^v", "").split("\\.");
        try {
            for (int i = 0; i < 3; i++) {
                long x = Long.parseLong(a[i]), y = Long.parseLong(b[i]);
                if (x != y) return x > y;
            }
        } catch (NumberFormatException ignored) { return false; }
        return false;
    }

    static boolean trustedAsset(String url, String tag, String digest, long size) {
        return tag.matches("v?\\d+\\.\\d+\\.\\d+")
            && url.equals(PREFIX + tag + "/GlobalPay.apk")
            && digest.matches("sha256:[a-fA-F0-9]{64}") && size > 0 && size <= MAX_BYTES;
    }

    static boolean trustedRedirect(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && uri.getUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && ("github.com".equals(host) || "release-assets.githubusercontent.com".equals(host)
                    || "objects.githubusercontent.com".equals(host));
        } catch (Exception ignored) { return false; }
    }
}
