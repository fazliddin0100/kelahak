// Mezon: sinov uchun HTTPS (TLS 1.3) teskari proksi — Nginx o'rnatilmagan kompyuterda
// lokal tarmoqdagi boshqa kompyuterlardan E-IMZO bilan kirishni sinash uchun.
// Brauzer E-IMZO kalitini faqat himoyalangan ulanishda (HTTPS) ochadi.
//
// Ishlatish:
//   1) bash scripts/pki/issue-server.sh local localhost 127.0.0.1 <bu kompyuter IP>
//   2) npm run dev            (ilova 127.0.0.1:3001 da)
//   3) node scripts/dev-https.mjs [--cert secrets/pki-servers/local/local.fullchain.crt]
//         [--key secrets/pki-servers/local/local.key] [--port 3443] [--mtls-port 8443 --ca secrets/pki/ca.crt]
//   4) Boshqa kompyuterda ca.crt ni ishonchli ildiz sifatida o'rnatib, https://<IP>:3443 ni oching
//
// Productionda bu skript emas, deploy/nginx/*.conf ishlatiladi.
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const certFile = opt('cert', 'secrets/pki-servers/local/local.fullchain.crt');
const keyFile = opt('key', 'secrets/pki-servers/local/local.key');
const port = Number(opt('port', '3443'));
const mtlsPort = opt('mtls-port');
const caFile = opt('ca', 'secrets/pki/ca.crt');
const upstream = { host: '127.0.0.1', port: Number(opt('upstream-port', '3001')) };

// Mijozdan kelgan ichki sarlavhalar o'chiriladi (Nginx konfiguratsiyasi bilan bir xil)
const STRIP = ['x-user-id', 'x-user-role', 'x-access-approved', 'x-session-id', 'x-mezon-site-cert', 'x-mezon-site-verify'];

function proxy(req, res, extra = {}) {
  const headers = { ...req.headers };
  for (const h of STRIP) delete headers[h];
  const ip = (req.socket.remoteAddress ?? '').replace(/^::ffff:/, '');
  headers['x-forwarded-for'] = headers['x-forwarded-for'] ? `${headers['x-forwarded-for']}, ${ip}` : ip;
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-host'] = req.headers.host ?? '';
  Object.assign(headers, extra);

  const up = http.request({ ...upstream, method: req.method, path: req.url, headers }, (upRes) => {
    res.writeHead(upRes.statusCode ?? 502, upRes.headers);
    upRes.pipe(res);
  });
  up.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Mezon ilovasi ishlamayapti (127.0.0.1:3001).');
  });
  req.pipe(up);
}

const tls = {
  cert: readFileSync(certFile),
  key: readFileSync(keyFile),
  minVersion: 'TLSv1.3',
};

https.createServer(tls, (req, res) => proxy(req, res)).listen(port, '0.0.0.0', () => {
  console.log(`HTTPS (TLS 1.3): https://0.0.0.0:${port} -> http://127.0.0.1:${upstream.port}`);
});

if (mtlsPort) {
  // Viloyat serverlari uchun: mijoz sertifikati majburiy (Nginx: ssl_verify_client on)
  https
    .createServer({ ...tls, ca: readFileSync(caFile), requestCert: true, rejectUnauthorized: true }, (req, res) => {
      const peer = req.socket.getPeerCertificate();
      proxy(req, res, { 'x-mezon-site-cert': peer?.subject?.CN ?? '', 'x-mezon-site-verify': 'SUCCESS' });
    })
    .listen(Number(mtlsPort), '0.0.0.0', () => {
      console.log(`mTLS: https://0.0.0.0:${mtlsPort} (mijoz sertifikati majburiy, CA: ${caFile})`);
    });
}
